-- Return each title's id too, so the app can add it to a watchlist or rate it straight away.
drop function public.world_trending(public.title_category, int);
create function public.world_trending(p_category public.title_category default null, p_limit int default 20)
returns table (id bigint, key text, category public.title_category, title text, creator text, year text,
               rank int, previous_rank int, score bigint, source text, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select t.id, t.key, w.category, t.title, t.creator, t.year, w.rank, w.previous_rank, w.score, w.source, w.updated_at
  from public.world_trending w join public.titles t on t.id = w.title_id
  where p_category is null or w.category = p_category
  order by w.rank, w.category
  limit least(greatest(p_limit, 1), 100);
$$;
revoke execute on function public.world_trending(public.title_category, int) from public, anon;
grant execute on function public.world_trending(public.title_category, int) to authenticated;
