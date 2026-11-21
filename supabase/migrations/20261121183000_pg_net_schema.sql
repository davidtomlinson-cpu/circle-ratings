-- pg_net was created in the public schema; Supabase recommends the extensions schema.
-- Its functions live in the "net" schema either way, so private.refresh_world_trending() is unaffected.
drop extension if exists pg_net;
create extension pg_net with schema extensions;
