-- Circle: personal invite codes ------------------------------------------------
-- One reusable code per person. Format XXXX-XXXX from an unambiguous alphabet.
create table public.invites (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$'),
  created_at timestamptz not null default now()
);
alter table public.invites enable row level security;
create policy "invites: read own" on public.invites for select to authenticated using (owner_id = (select auth.uid()));

create function private.new_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  res text := '';
  b bytea := extensions.gen_random_bytes(8);
begin
  for i in 0..7 loop
    if i = 4 then res := res || '-'; end if;
    res := res || substr(alphabet, 1 + (get_byte(b, i) % 32), 1);
  end loop;
  return res;
end $$;

-- Your code (created on first use). `p_new` replaces it, so old shared links stop working.
create function public.my_invite_code(p_new boolean default false) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  c text;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if not p_new then
    select code into c from public.invites where owner_id = uid;
    if c is not null then return c; end if;
  end if;
  loop
    c := private.new_code();
    begin
      insert into public.invites (owner_id, code) values (uid, c)
      on conflict (owner_id) do update set code = excluded.code, created_at = now();
      return c;
    exception when unique_violation then -- code clash, try another
    end;
  end loop;
end $$;

-- Who sent this code? Lets the join screen say "Join Sam's circle?" before accepting.
create function public.invite_preview(p_code text) returns table (owner_name text, already_in boolean, is_self boolean)
language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(p.display_name, ''), 'Someone'),
         private.in_circle(i.owner_id, auth.uid()),
         i.owner_id = auth.uid()
  from public.invites i join public.profiles p on p.id = i.owner_id
  where i.code = upper(trim(p_code));
$$;

create function public.accept_invite(p_code text) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  owner uuid;
  owner_name text;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select i.owner_id, coalesce(nullif(p.display_name, ''), 'Someone') into owner, owner_name
  from public.invites i join public.profiles p on p.id = i.owner_id
  where i.code = upper(trim(p_code));
  if owner is null then raise exception 'That code isn''t recognised' using hint = 'invite_invalid'; end if;
  if owner = uid then raise exception 'That''s your own code' using hint = 'invite_self'; end if;
  insert into public.circle_members (owner_id, member_id) values (owner, uid), (uid, owner) on conflict do nothing;
  return owner_name;
end $$;

-- Leaving / removing works both ways.
create function public.remove_from_circle(p_member uuid) returns void
language sql volatile security definer set search_path = '' as $$
  delete from public.circle_members
  where (owner_id = auth.uid() and member_id = p_member) or (owner_id = p_member and member_id = auth.uid());
  delete from public.visibility_grants
  where (owner_id = auth.uid() and viewer_id = p_member) or (owner_id = p_member and viewer_id = auth.uid());
$$;

-- Circle overview for the Contacts page: what each side can see, plus counts you're allowed to see.
create function public.circle_overview()
returns table (member_id uuid, name text, sees_mine boolean, i_see_theirs boolean, rated bigint, top_title_key text, joined_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.member_id,
         coalesce(nullif(p.display_name, ''), 'Someone'),
         private.can_view(auth.uid(), m.member_id),
         private.can_view(m.member_id, auth.uid()),
         case when private.can_view(m.member_id, auth.uid()) then (select count(*) from public.ratings r where r.user_id = m.member_id) end,
         case when private.can_view(m.member_id, auth.uid()) then (
           select t.key from public.ratings r join public.titles t on t.id = r.title_id
           where r.user_id = m.member_id order by r.hearts desc, r.rated_at desc limit 1) end,
         m.created_at
  from public.circle_members m join public.profiles p on p.id = m.member_id
  where m.owner_id = auth.uid()
  order by p.display_name;
$$;

-- Everyone's Top 20: average across all ratings, minimum 3 ratings per title.
create function public.everyone_top20(p_category public.title_category default null)
returns table (key text, avg_hearts numeric, ratings bigint)
language sql stable security definer set search_path = '' as $$
  select t.key, round(avg(r.hearts), 1), count(*)
  from public.ratings r join public.titles t on t.id = r.title_id
  where p_category is null or t.category = p_category
  group by t.key
  having count(*) >= 3
  order by avg(r.hearts) desc, count(*) desc
  limit 20;
$$;

-- Notifications --------------------------------------------------------------
create type public.notification_kind as enum ('rating', 'comment', 'joined');

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,   -- recipient
  actor_id uuid not null references auth.users (id) on delete cascade,
  kind public.notification_kind not null,
  title_id bigint references public.titles (id) on delete cascade,
  hearts smallint,
  body text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_actor_idx on public.notifications (actor_id);
create index notifications_title_idx on public.notifications (title_id);
alter table public.notifications enable row level security;
create policy "notifications: read own" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
-- Only read_at may change (enforced by the column grant below).
create policy "notifications: mark own read" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- A new or changed rating notifies circle members who are allowed to see it and want alerts.
create function private.notify_rating() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and old.hearts = new.hearts then return new; end if;
  insert into public.notifications (user_id, actor_id, kind, title_id, hearts)
  select m.member_id, new.user_id, 'rating', new.title_id, new.hearts
  from public.circle_members m join public.profiles p on p.id = m.member_id
  where m.owner_id = new.user_id and p.notify_circle and private.can_view(new.user_id, m.member_id);
  return new;
end $$;
create trigger ratings_notify after insert or update on public.ratings
for each row execute function private.notify_rating();

-- Comments notify the author's circle (they can already see the comment).
create function private.notify_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, actor_id, kind, title_id, body)
  select m.member_id, new.author_id, 'comment', new.title_id, left(new.body, 200)
  from public.circle_members m join public.profiles p on p.id = m.member_id
  where m.owner_id = new.author_id and p.notify_circle;
  return new;
end $$;
create trigger comments_notify after insert on public.comments
for each row execute function private.notify_comment();

-- Joining tells the person whose code was used.
create function private.notify_joined() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- accept_invite inserts (owner -> joiner) and (joiner -> owner); notify on the first only.
  if new.owner_id <> auth.uid() then
    insert into public.notifications (user_id, actor_id, kind) values (new.owner_id, new.member_id, 'joined');
  end if;
  return new;
end $$;
create trigger circle_notify after insert on public.circle_members
for each row execute function private.notify_joined();

-- Notification list with names attached.
create function public.my_notifications(p_limit int default 50)
returns table (id bigint, kind public.notification_kind, actor_id uuid, actor_name text, title_key text, hearts smallint, body text, created_at timestamptz, read_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select n.id, n.kind, n.actor_id, coalesce(nullif(p.display_name, ''), 'Someone'), t.key, n.hearts, n.body, n.created_at, n.read_at
  from public.notifications n
  join public.profiles p on p.id = n.actor_id
  left join public.titles t on t.id = n.title_id
  where n.user_id = auth.uid()
  order by n.created_at desc
  limit least(greatest(p_limit, 1), 200);
$$;

-- Permissions -------------------------------------------------------------------
revoke all on function private.new_code() from public, anon, authenticated;
revoke all on function private.notify_rating() from public, anon, authenticated;
revoke all on function private.notify_comment() from public, anon, authenticated;
revoke all on function private.notify_joined() from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array[
    'public.my_invite_code(boolean)', 'public.invite_preview(text)', 'public.accept_invite(text)',
    'public.remove_from_circle(uuid)', 'public.circle_overview()', 'public.everyone_top20(public.title_category)',
    'public.my_notifications(int)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
revoke all on public.invites, public.notifications from anon;

-- Live notification badge
alter publication supabase_realtime add table public.notifications;
