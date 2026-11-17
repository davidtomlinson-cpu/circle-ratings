-- Rating rules enforced server-side ----------------------------------------
create function private.ratings_before() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  month_start timestamptz := date_trunc('month', now() at time zone 'Europe/London') at time zone 'Europe/London';
  spent int;
begin
  new.rated_at := now();
  new.from_watchlist := (tg_op = 'UPDATE' and old.from_watchlist)
    or exists (select 1 from public.watchlist w where w.user_id = new.user_id and w.title_id = new.title_id);

  -- Monthly budget of 60 hearts. Re-rating something rated this month costs the difference.
  select coalesce(sum(hearts), 0) into spent from public.ratings r
  where r.user_id = new.user_id and r.title_id <> new.title_id and r.rated_at >= month_start;
  if spent + new.hearts > 60 then
    raise exception 'Not enough hearts left this month' using errcode = 'P0001', hint = 'heart_budget';
  end if;
  return new;
end $$;

create function private.ratings_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  share boolean;
begin
  if tg_op = 'DELETE' then
    delete from public.worldwide_loves where title_id = old.title_id and voter_hash = private.voter_hash(old.user_id);
    return old;
  end if;

  delete from public.watchlist where user_id = new.user_id and title_id = new.title_id;

  select contribute_worldwide into share from public.profiles where id = new.user_id;
  -- Only a 5 for something finished from the watchlist counts worldwide.
  if new.hearts = 5 and new.from_watchlist and coalesce(share, false) then
    insert into public.worldwide_loves (title_id, voter_hash)
    values (new.title_id, private.voter_hash(new.user_id)) on conflict do nothing;
  elsif new.hearts < 5 then
    delete from public.worldwide_loves where title_id = new.title_id and voter_hash = private.voter_hash(new.user_id);
  end if;
  return new;
end $$;

create trigger ratings_before before insert or update on public.ratings
for each row execute function private.ratings_before();
create trigger ratings_after after insert or update or delete on public.ratings
for each row execute function private.ratings_after();

-- Permissions on helpers ---------------------------------------------------
revoke all on all functions in schema private from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.in_circle(uuid, uuid) to authenticated;
grant execute on function private.can_view(uuid, uuid) to authenticated;

-- Row level security -------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.titles enable row level security;
alter table public.circle_members enable row level security;
alter table public.visibility_grants enable row level security;
alter table public.watchlist enable row level security;
alter table public.ratings enable row level security;
alter table public.comments enable row level security;
alter table public.worldwide_loves enable row level security; -- no policies: read via RPC only

-- Profiles: you, and people in your circle.
create policy "profiles: read self and circle" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.in_circle((select auth.uid()), id));
create policy "profiles: update self" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Titles: everyone signed in can read; users can add their own custom titles.
create policy "titles: read" on public.titles for select to authenticated using (true);
create policy "titles: add custom" on public.titles for insert to authenticated
  with check (source = 'custom' and created_by = (select auth.uid()) and top50_rank is null);

-- Circle: see links involving you; remove people from your own circle.
create policy "circle: read own links" on public.circle_members for select to authenticated
  using (owner_id = (select auth.uid()) or member_id = (select auth.uid()));
create policy "circle: remove from own" on public.circle_members for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Visibility grants: owner manages, only for people in their circle.
create policy "grants: read own" on public.visibility_grants for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "grants: add own" on public.visibility_grants for insert to authenticated
  with check (owner_id = (select auth.uid()) and private.in_circle((select auth.uid()), viewer_id));
create policy "grants: remove own" on public.visibility_grants for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Watchlist: private to the user.
create policy "watchlist: own" on public.watchlist for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Ratings: write your own; read your own and those your circle lets you see.
create policy "ratings: read visible" on public.ratings for select to authenticated
  using (private.can_view(user_id, (select auth.uid())));
create policy "ratings: insert own" on public.ratings for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "ratings: update own" on public.ratings for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "ratings: delete own" on public.ratings for delete to authenticated
  using (user_id = (select auth.uid()));

-- Comments: visible to the author and the author's circle.
create policy "comments: read circle" on public.comments for select to authenticated
  using (author_id = (select auth.uid()) or private.in_circle(author_id, (select auth.uid())));
create policy "comments: add own" on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()));
create policy "comments: delete own" on public.comments for delete to authenticated
  using (author_id = (select auth.uid()));

-- Anonymous users get nothing.
revoke all on all tables in schema public from anon;

-- Loved worldwide read API -------------------------------------------------
-- Titles appear once they pass a minimum number of votes, so no single person's rating is exposed.
create function public.loved_worldwide(p_category public.title_category default null, p_classics boolean default true, p_limit int default 30)
returns table (title_id bigint, key text, total bigint, today bigint)
language sql stable security definer set search_path = '' as $$
  select t.id, t.key, count(*) as total,
         count(*) filter (where l.created_at >= now() - interval '24 hours') as today
  from public.worldwide_loves l
  join public.titles t on t.id = l.title_id
  where (p_category is null or t.category = p_category)
    and ((p_classics and t.source = 'top50') or (not p_classics and t.source <> 'top50'))
  group by t.id, t.key
  having count(*) >= 3
  order by total desc
  limit least(greatest(p_limit, 1), 100);
$$;

create function public.loved_worldwide_total() returns bigint
language sql stable security definer set search_path = '' as $$
  select count(*) from public.worldwide_loves;
$$;

revoke all on function public.loved_worldwide(public.title_category, boolean, int) from public, anon;
revoke all on function public.loved_worldwide_total() from public, anon;
grant execute on function public.loved_worldwide(public.title_category, boolean, int) to authenticated;
grant execute on function public.loved_worldwide_total() to authenticated;
