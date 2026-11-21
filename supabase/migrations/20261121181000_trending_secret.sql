-- Shared secret for the daily trending refresh, created and kept inside the database (Vault).
-- pg_cron sends it to the trending-refresh function, which asks the database to check it,
-- so the value never has to be copied anywhere else.
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'trending_cron_secret', 'Daily trending refresh: pg_cron to edge function')
where not exists (select 1 from vault.secrets where name = 'trending_cron_secret');

create function public.check_trending_secret(p_secret text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_secret is not null and p_secret = (select decrypted_secret from vault.decrypted_secrets where name = 'trending_cron_secret');
$$;
revoke execute on function public.check_trending_secret(text) from public, anon, authenticated;
grant execute on function public.check_trending_secret(text) to service_role;
