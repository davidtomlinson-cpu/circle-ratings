-- Remove the monthly "jar of hearts" budget: rate as many titles as you like.
-- Everything else ratings_before() did stays the same.
create or replace function private.ratings_before() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.rated_at := now();
  new.from_watchlist := (tg_op = 'UPDATE' and old.from_watchlist)
    or exists (select 1 from public.watchlist w where w.user_id = new.user_id and w.title_id = new.title_id);
  return new;
end $$;
