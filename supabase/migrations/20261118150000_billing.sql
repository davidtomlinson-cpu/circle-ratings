-- Billing: store subscriptions (written only by server functions fed by RevenueCat),
-- family/extended plan invitations, one access rule used everywhere, trial reminders.


-- One row per paying person. Written by edge functions with the service role; users can only read their own.
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tier public.plan_tier not null,
  period public.bill_period not null,
  store text not null check (store in ('app_store', 'play_store', 'test')),
  product_id text not null,
  in_trial boolean not null default false,
  will_renew boolean not null default true,
  billing_issue boolean not null default false,
  expires_at timestamptz not null,
  sandbox boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create policy "subscriptions: read own" on public.subscriptions for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.subscriptions from anon, authenticated;

create function private.places(t public.plan_tier) returns int
language sql immutable set search_path = '' as $$
  select case t when 'individual' then 1 when 'family' then 6 when 'extended' then 10 end;
$$;

-- Invitation slots for a family/extended owner: one per place after the owner's own.
-- Each slot always has a current code; when someone joins, member_id is set.
create table public.family_slots (
  owner_id uuid not null references auth.users (id) on delete cascade,
  slot smallint not null check (slot between 1 and 9),
  code text not null unique check (code ~ '^HEART-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$'),
  member_id uuid unique references auth.users (id) on delete set null,
  joined_at timestamptz,
  primary key (owner_id, slot)
);
create index family_slots_member_idx on public.family_slots (member_id);
alter table public.family_slots enable row level security; -- no policies: everything goes through the functions below

create function private.new_family_code() returns text
language sql volatile set search_path = '' as $$
  select 'HEART-' || private.new_code();
$$;

-- Active own subscription (trial, paid, or cancelled-but-not-yet-expired).
create function private.active_sub(uid uuid) returns public.subscriptions
language sql stable security definer set search_path = '' as $$
  select * from public.subscriptions where user_id = uid and expires_at > now();
$$;

-- The single access rule: your own active plan, or a filled slot on an active family/extended plan
-- (only slots within the plan's current number of places count).
create function private.access(uid uuid)
returns table (has_access boolean, source text, owner_id uuid, tier public.plan_tier, expires_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with own as (
    select 1 as prio, true, 'own'::text, s.user_id, s.tier, s.expires_at from public.subscriptions s
    where s.user_id = uid and s.expires_at > now()
  ), fam as (
    select 2 as prio, true, 'family'::text, s.user_id, s.tier, s.expires_at
    from public.family_slots f join public.subscriptions s on s.user_id = f.owner_id
    where f.member_id = uid and s.expires_at > now() and s.tier in ('family', 'extended')
      and f.slot < private.places(s.tier)
  )
  select a.has_access, a.source, a.owner_id, a.tier, a.expires_at from (
    select * from own
    union all select * from fam
    union all select 3, false, 'none', null::uuid, null::public.plan_tier, null::timestamptz
  ) a (prio, has_access, source, owner_id, tier, expires_at)
  order by a.prio
  limit 1;
$$;

create function private.has_access(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select has_access from private.access(uid);
$$;

-- What the app needs to know about the signed-in user's plan.
create function public.my_access()
returns table (
  has_access boolean, source text, tier public.plan_tier, period public.bill_period, expires_at timestamptz,
  in_trial boolean, will_renew boolean, billing_issue boolean, store text, owner_name text, own_sub_active boolean
)
language sql stable security definer set search_path = '' as $$
  select a.has_access, a.source, a.tier,
         s.period, a.expires_at, coalesce(s.in_trial, false), coalesce(s.will_renew, false),
         coalesce(s.billing_issue, false), s.store,
         case when a.source = 'family' then (select coalesce(nullif(p.display_name, ''), 'Someone') from public.profiles p where p.id = a.owner_id) end,
         exists (select 1 from public.subscriptions o where o.user_id = auth.uid() and o.expires_at > now())
  from private.access(auth.uid()) a
  left join public.subscriptions s on s.user_id = a.owner_id;
$$;

-- Owner view of their invitations. Creates missing slots (and codes) for the plan's places.
create function public.my_family()
returns table (slot smallint, code text, member_id uuid, member_name text, joined_at timestamptz, places int, active boolean)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  s public.subscriptions;
  n int;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into s from public.subscriptions where user_id = uid;
  if s.user_id is null or s.tier = 'individual' then return; end if;
  n := private.places(s.tier);
  for i in 1 .. n - 1 loop
    loop
      begin
        insert into public.family_slots (owner_id, slot, code) values (uid, i, private.new_family_code()) on conflict (owner_id, slot) do nothing;
        exit;
      exception when unique_violation then -- code clash, retry
      end;
    end loop;
  end loop;
  return query
    select f.slot, f.code, f.member_id, coalesce(nullif(p.display_name, ''), 'Someone'), f.joined_at, n, s.expires_at > now()
    from public.family_slots f left join public.profiles p on p.id = f.member_id
    where f.owner_id = uid and f.slot < n
    order by f.slot;
end $$;

-- Replace an unused code, or remove a member (which frees the place and issues a fresh code).
create function public.reset_family_slot(p_slot smallint) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  loop
    begin
      update public.family_slots set code = private.new_family_code(), member_id = null, joined_at = null
      where owner_id = uid and slot = p_slot;
      exit;
    exception when unique_violation then
    end;
  end loop;
end $$;

create function public.family_invite_preview(p_code text)
returns table (owner_name text, tier public.plan_tier, valid boolean, reason text, own_sub_active boolean)
language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(p.display_name, ''), 'Someone'), s.tier,
         (f.owner_id <> auth.uid() and f.member_id is null and s.expires_at > now() and s.tier <> 'individual'
          and f.slot < private.places(s.tier)
          and not exists (select 1 from public.family_slots x where x.member_id = auth.uid())),
         case
           when f.owner_id = auth.uid() then 'self'
           when f.member_id = auth.uid() then 'already_member'
           when exists (select 1 from public.family_slots x where x.member_id = auth.uid()) then 'in_other_family'
           when f.member_id is not null then 'used'
           when s.expires_at is null or s.expires_at <= now() or s.tier = 'individual' or f.slot >= private.places(s.tier) then 'plan_inactive'
           else 'ok' end,
         exists (select 1 from public.subscriptions o where o.user_id = auth.uid() and o.expires_at > now())
  from public.family_slots f
  join public.profiles p on p.id = f.owner_id
  left join public.subscriptions s on s.user_id = f.owner_id
  where f.code = upper(trim(p_code));
$$;

create function public.join_family(p_code text) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  pv record;
  f public.family_slots;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into pv from public.family_invite_preview(p_code);
  if not found then raise exception 'That code isn''t recognised' using hint = 'family_invalid'; end if;
  if not coalesce(pv.valid, false) then
    raise exception '%', case pv.reason
      when 'self' then 'That''s one of your own invitations'
      when 'already_member' then 'You''re already on this plan'
      when 'in_other_family' then 'You''re already on another family plan. Leave it first in Settings.'
      when 'used' then 'That invitation has already been used'
      else 'That plan isn''t active any more' end
      using hint = 'family_' || pv.reason;
  end if;
  update public.family_slots set member_id = uid, joined_at = now()
  where code = upper(trim(p_code)) and member_id is null
  returning * into f;
  if f.owner_id is null then raise exception 'That invitation has already been used' using hint = 'family_used'; end if;
  insert into public.notifications (user_id, actor_id, kind) values (f.owner_id, uid, 'family_joined');
  return pv.owner_name;
end $$;

create function public.leave_family() returns void
language sql volatile security definer set search_path = '' as $$
  update public.family_slots set member_id = null, joined_at = null where member_id = auth.uid();
$$;

-- Server-side paywall: ratings and comments need access. (Browsing never does.)
create function private.require_access() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_access(auth.uid()) then
    raise exception 'A subscription is needed to do that' using errcode = 'P0001', hint = 'subscription_required';
  end if;
  return new;
end $$;
create trigger ratings_require_access before insert or update on public.ratings
for each row execute function private.require_access();
create trigger comments_require_access before insert on public.comments
for each row execute function private.require_access();

-- Trial reminder (Day 5 of 7): an in-app notification two days before the trial converts.
-- Always sent: it's a required reminder, not a preference.
create table private.trial_reminders_sent (user_id uuid not null, expires_at timestamptz not null, primary key (user_id, expires_at));

create function private.send_trial_reminders() returns int
language plpgsql volatile security definer set search_path = '' as $$
declare n int;
begin
  with due as (
    select s.user_id, s.expires_at from public.subscriptions s
    where s.in_trial and s.expires_at between now() and now() + interval '2 days 1 hour'
      and not exists (select 1 from private.trial_reminders_sent r where r.user_id = s.user_id and r.expires_at = s.expires_at)
  ), marked as (
    insert into private.trial_reminders_sent select user_id, expires_at from due returning user_id
  )
  insert into public.notifications (user_id, actor_id, kind) select user_id, user_id, 'trial_ending' from marked;
  get diagnostics n = row_count;
  return n;
end $$;

create extension if not exists pg_cron;
select cron.schedule('trial-reminders', '15 * * * *', 'select private.send_trial_reminders()');

-- Permissions
revoke all on function private.places(public.plan_tier), private.new_family_code(), private.active_sub(uuid),
  private.access(uuid), private.has_access(uuid), private.require_access(), private.send_trial_reminders()
  from public, anon, authenticated;
revoke all on private.trial_reminders_sent from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array[
    'public.my_access()', 'public.my_family()', 'public.reset_family_slot(smallint)',
    'public.family_invite_preview(text)', 'public.join_family(text)', 'public.leave_family()'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
revoke all on public.subscriptions, public.family_slots from anon;
