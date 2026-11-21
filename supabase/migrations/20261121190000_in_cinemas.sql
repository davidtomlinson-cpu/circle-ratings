-- "In cinemas": trending films released in UK cinemas in the last 8 weeks (not streaming-only).
-- The daily refresh marks them; the app asks for them with p_in_cinemas.
alter table public.world_trending
  add column in_cinemas boolean not null default false,
  add column release_date date;

create or replace function private.replace_world_trending(p_category public.title_category, p_source text, p_rows jsonb)
returns int language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  create temp table prev on commit drop as
    select title_id, rank from public.world_trending where category = p_category;
  delete from public.world_trending where category = p_category;
  insert into public.world_trending (category, rank, title_id, score, previous_rank, source, in_cinemas, release_date)
  select p_category, e.ord::int, (e.r->>'title_id')::bigint, (e.r->>'score')::bigint, p.rank, p_source,
         coalesce((e.r->>'in_cinemas')::boolean, false), (e.r->>'release_date')::date
  from jsonb_array_elements(p_rows) with ordinality as e(r, ord)
  left join prev p on p.title_id = (e.r->>'title_id')::bigint
  where e.ord <= 100;
  get diagnostics n = row_count;
  drop table prev;
  return n;
end $$;

drop function public.world_trending(public.title_category, int);
create function public.world_trending(p_category public.title_category default null, p_limit int default 20, p_in_cinemas boolean default false)
returns table (id bigint, key text, category public.title_category, title text, creator text, year text,
               rank int, previous_rank int, score bigint, source text, updated_at timestamptz, release_date date)
language sql stable security definer set search_path = '' as $$
  select t.id, t.key, w.category, t.title, t.creator, t.year,
         -- The cinema list is numbered on its own, and has no day-to-day movement.
         case when p_in_cinemas then (row_number() over (order by w.rank))::int else w.rank end,
         case when p_in_cinemas then null else w.previous_rank end,
         w.score, w.source, w.updated_at, w.release_date
  from public.world_trending w join public.titles t on t.id = w.title_id
  where (p_category is null or w.category = p_category)
    and (not p_in_cinemas or (w.category = 'Movies' and w.in_cinemas))
  order by w.rank, w.category
  limit least(greatest(p_limit, 1), 100);
$$;
revoke execute on function public.world_trending(public.title_category, int, boolean) from public, anon;
grant execute on function public.world_trending(public.title_category, int, boolean) to authenticated;
