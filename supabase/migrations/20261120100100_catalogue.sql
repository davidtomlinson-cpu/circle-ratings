-- Real catalogue: films, TV and books from Wikidata, albums from MusicBrainz (both CC0).
-- The app never writes these rows itself: the `catalogue` edge function looks a title up at the source
-- and inserts it with the service role. Keys: 'wd:Q123' and 'mb:<release-group id>'.

create extension if not exists pg_trgm with schema extensions;

alter table public.titles
  add column if not exists wikidata_id text check (wikidata_id ~ '^Q[0-9]+$'),
  add column if not exists popularity integer not null default 0;   -- Wikidata sitelinks / MusicBrainz release count
alter table public.titles
  add constraint titles_musicbrainz_id_format check (musicbrainz_id is null or musicbrainz_id ~ '^[0-9a-f-]{36}$');

create unique index if not exists titles_wikidata_id_key on public.titles (wikidata_id) where wikidata_id is not null;
create unique index if not exists titles_musicbrainz_id_key on public.titles (musicbrainz_id) where musicbrainz_id is not null;
create index if not exists titles_title_trgm on public.titles using gin (lower(title) extensions.gin_trgm_ops);
create index if not exists titles_creator_trgm on public.titles using gin (lower(creator) extensions.gin_trgm_ops);

-- Search answers from the outside sources, kept for a week so repeat searches don't hit their rate limits.
-- Only the catalogue edge function (service role) uses it: RLS on, no policies.
create table public.catalogue_cache (
  source text not null check (source in ('wikidata', 'musicbrainz')),
  query text not null,
  results jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (source, query)
);
alter table public.catalogue_cache enable row level security;
revoke all on public.catalogue_cache from anon, authenticated;

-- Titles already in our database that match the words typed, most popular first.
-- Other people's custom titles are never returned.
create or replace function public.search_titles(p_q text, p_category public.title_category default null, p_limit int default 20)
returns table (key text, category public.title_category, title text, creator text, year text, source public.title_source)
language sql stable security invoker set search_path = '' as $$
  with q as (select lower(trim(p_q)) as raw),
  e as (select raw, replace(replace(replace(raw, '\', '\\'), '%', '\%'), '_', '\_') as s from q)   -- typed % and _ are plain text
  select t.key, t.category, t.title, t.creator, t.year, t.source
  from public.titles t, e
  where char_length(e.raw) >= 2
    and (p_category is null or t.category = p_category)
    and (t.source <> 'custom' or t.created_by = auth.uid())
    and (lower(t.title) like '%' || e.s || '%' or lower(t.creator) like '%' || e.s || '%'
         or lower(t.title || ' ' || t.creator) like '%' || e.s || '%')
  order by (lower(t.title) = e.raw) desc, (lower(t.title) like e.s || '%') desc,
           t.popularity desc, t.top50_rank nulls last, t.title
  limit least(greatest(p_limit, 1), 50);
$$;
grant execute on function public.search_titles(text, public.title_category, int) to authenticated;

-- Trending on SofaList: titles the most different people rated or added to a watchlist in the last N days.
-- Counts only, never who. A title needs at least 3 people, the same minimum as the other shared lists.
create or replace function public.trending_titles(p_category public.title_category default null, p_days int default 7, p_limit int default 20)
returns table (key text, category public.title_category, title text, creator text, year text, people bigint, previous bigint)
language sql stable security definer set search_path = '' as $$
  with win as (select now() - make_interval(days => least(greatest(p_days, 1), 30)) as since,
                      now() - make_interval(days => 2 * least(greatest(p_days, 1), 30)) as prev),
  activity as (
    select r.title_id, r.user_id, r.rated_at as at from public.ratings r, win where r.rated_at >= win.prev
    union all
    select w.title_id, w.user_id, w.added_at from public.watchlist w, win where w.added_at >= win.prev
  ),
  counts as (
    select a.title_id,
           count(distinct a.user_id) filter (where a.at >= (select since from win)) as people,
           count(distinct a.user_id) filter (where a.at < (select since from win)) as previous
    from activity a group by a.title_id
  )
  select t.key, t.category, t.title, t.creator, t.year, c.people, c.previous
  from counts c join public.titles t on t.id = c.title_id
  where c.people >= 3
    and (p_category is null or t.category = p_category)
    and (t.source <> 'custom')
  order by c.people desc, t.popularity desc
  limit least(greatest(p_limit, 1), 50);
$$;
revoke execute on function public.trending_titles(public.title_category, int, int) from public, anon;
grant execute on function public.trending_titles(public.title_category, int, int) to authenticated;
