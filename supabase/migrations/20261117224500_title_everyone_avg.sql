-- Average hearts across everyone for one title. Hidden below 3 ratings so no individual rating can be inferred.
create function public.title_everyone(p_title_id bigint)
returns table (avg_hearts numeric, ratings bigint)
language sql stable security definer set search_path = '' as $$
  select case when count(*) >= 3 then round(avg(hearts), 1) end, count(*)
  from public.ratings where title_id = p_title_id;
$$;
revoke all on function public.title_everyone(bigint) from public, anon;
grant execute on function public.title_everyone(bigint) to authenticated;
