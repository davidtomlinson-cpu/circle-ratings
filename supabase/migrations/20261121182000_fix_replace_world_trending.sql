-- Fix: Postgres doesn't allow WITH ORDINALITY together with jsonb_to_recordset's column list.
create or replace function private.replace_world_trending(p_category public.title_category, p_source text, p_rows jsonb)
returns int language plpgsql security definer set search_path = '' as $$
declare
  n int;
begin
  create temp table prev on commit drop as
    select title_id, rank from public.world_trending where category = p_category;
  delete from public.world_trending where category = p_category;
  insert into public.world_trending (category, rank, title_id, score, previous_rank, source)
  select p_category, e.ord::int, (e.r->>'title_id')::bigint, (e.r->>'score')::bigint, p.rank, p_source
  from jsonb_array_elements(p_rows) with ordinality as e(r, ord)
  left join prev p on p.title_id = (e.r->>'title_id')::bigint
  where e.ord <= 100;
  get diagnostics n = row_count;
  drop table prev;
  return n;
end $$;
