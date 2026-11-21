-- 1) A daily tally of how the outside sources answer (ok / busy / failed), so we can see trouble before users do.
--    Written by the edge functions at the end of each request; read in the SQL editor (see docs/catalogue.md).
create table public.source_health (
  day date not null default (now() at time zone 'Europe/London')::date,
  source text not null,
  ok int not null default 0,
  busy int not null default 0,
  failed int not null default 0,
  primary key (day, source)
);
alter table public.source_health enable row level security; -- no policies: service role only
revoke all on public.source_health from anon, authenticated;

-- counts: {"wikidata": {"ok": 3, "busy": 1, "failed": 0}, ...}
create function public.record_source_health(p_counts jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.source_health as h (source, ok, busy, failed)
  select k, coalesce((v->>'ok')::int, 0), coalesce((v->>'busy')::int, 0), coalesce((v->>'failed')::int, 0)
  from jsonb_each(p_counts) as e(k, v)
  on conflict (day, source) do update
    set ok = h.ok + excluded.ok, busy = h.busy + excluded.busy, failed = h.failed + excluded.failed;
$$;
revoke execute on function public.record_source_health(jsonb) from public, anon, authenticated;
grant execute on function public.record_source_health(jsonb) to service_role;

-- 2) The refresh job can be asked to do one part: 'all' (default), 'describe' (warm descriptions for trending
--    titles) or 'retry' (redo only if this morning's run didn't update the lists).
create or replace function private.refresh_world_trending(p_task text default 'all') returns bigint
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
    body := jsonb_build_object('task', p_task),
    timeout_milliseconds := 150000
  );
end $$;
revoke execute on function private.refresh_world_trending(text) from public, anon, authenticated;
drop function if exists private.refresh_world_trending();

-- 05:17 build the lists · 05:47 fetch descriptions for them · 08:47 and 11:47 retry if the lists are stale
select cron.unschedule('world-trending');
select cron.schedule('world-trending', '17 5 * * *', $$select private.refresh_world_trending('all')$$);
select cron.schedule('world-trending-describe', '47 5 * * *', $$select private.refresh_world_trending('describe')$$);
select cron.schedule('world-trending-retry', '47 8,11 * * *', $$select private.refresh_world_trending('retry')$$);
