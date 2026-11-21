-- "Trending this week" from outside the app, refreshed daily by the trending-refresh edge function:
--   films, TV and books ranked by English Wikipedia page views over the last 7 days,
--   albums ranked by ListenBrainz listens over the last week.
-- The function writes with the service role; the app reads through world_trending().

create table public.world_trending (
  category public.title_category not null,
  rank int not null check (rank between 1 and 100),
  title_id bigint not null references public.titles (id) on delete cascade,
  score bigint not null,               -- page views or listens this week
  previous_rank int,                   -- rank in the previous refresh, null if new
  source text not null check (source in ('wikipedia', 'listenbrainz')),
  updated_at timestamptz not null default now(),
  primary key (category, rank)
);
alter table public.world_trending enable row level security; -- no policies: read through world_trending()
revoke all on public.world_trending from anon, authenticated;

create function public.world_trending(p_category public.title_category default null, p_limit int default 20)
returns table (key text, category public.title_category, title text, creator text, year text,
               rank int, previous_rank int, score bigint, source text, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select t.key, w.category, t.title, t.creator, t.year, w.rank, w.previous_rank, w.score, w.source, w.updated_at
  from public.world_trending w join public.titles t on t.id = w.title_id
  where p_category is null or w.category = p_category
  -- Mixed list: interleave the categories by rank so one doesn't swamp the others.
  order by w.rank, w.category
  limit least(greatest(p_limit, 1), 100);
$$;
revoke execute on function public.world_trending(public.title_category, int) from public, anon;
grant execute on function public.world_trending(public.title_category, int) to authenticated;

-- Replace one category's list in one go, keeping each title's previous rank for the ▲/▼ markers.
-- rows: [{ "title_id": 1, "score": 123 }, ...] already in rank order.
create function private.replace_world_trending(p_category public.title_category, p_source text, p_rows jsonb)
returns int language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  create temp table prev on commit drop as
    select title_id, rank from public.world_trending where category = p_category;
  delete from public.world_trending where category = p_category;
  insert into public.world_trending (category, rank, title_id, score, previous_rank, source)
  select p_category, r.ord::int, r.title_id, r.score, p.rank, p_source
  from jsonb_to_recordset(p_rows) with ordinality as r(title_id bigint, score bigint, ord bigint)
  left join prev p on p.title_id = r.title_id
  where r.ord <= 100;
  get diagnostics n = row_count;
  drop table prev;
  return n;
end $$;
revoke execute on function private.replace_world_trending(public.title_category, text, jsonb) from public, anon, authenticated;

-- A wrapper the edge function can call through the API (private functions aren't exposed).
create function public.replace_world_trending(p_category public.title_category, p_source text, p_rows jsonb)
returns int language sql security definer set search_path = '' as $$
  select private.replace_world_trending(p_category, p_source, p_rows);
$$;
revoke execute on function public.replace_world_trending(public.title_category, text, jsonb) from public, anon, authenticated;
grant execute on function public.replace_world_trending(public.title_category, text, jsonb) to service_role;

-- Daily refresh at 05:17 UTC: pg_cron calls the edge function through pg_net with a shared secret
-- kept in Vault (name 'trending_cron_secret'), which the function checks.
create extension if not exists pg_net with schema extensions;

create function private.refresh_world_trending() returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  secret text := (select decrypted_secret from vault.decrypted_secrets where name = 'trending_cron_secret');
begin
  if secret is null then
    raise warning 'trending_cron_secret is missing from Vault';
    return null;
  end if;
  return net.http_post(
    url := 'https://fkyhmaorcrqzdbvktvcv.supabase.co/functions/v1/trending-refresh',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
end $$;
revoke execute on function private.refresh_world_trending() from public, anon, authenticated;

select cron.schedule('world-trending', '17 5 * * *', 'select private.refresh_world_trending()');
