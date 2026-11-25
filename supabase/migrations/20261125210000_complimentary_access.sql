-- 'comp': free access granted by hand (owners, friends). Store syncs never overwrite it while it lasts.
alter table public.subscriptions drop constraint subscriptions_store_check;
alter table public.subscriptions add constraint subscriptions_store_check check (store = any (array['app_store','play_store','test','comp']));
