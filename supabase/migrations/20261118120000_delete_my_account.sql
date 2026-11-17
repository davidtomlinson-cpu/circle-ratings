-- In-app account deletion (App Store guideline 5.1.1(v)).
-- Deletes the signed-in user. Everything else follows through foreign keys:
-- profile, watchlist, ratings (whose delete trigger removes their anonymous worldwide votes),
-- comments, circle links (both directions), visibility grants, invites, notifications sent and received.
-- Custom titles the user added are deleted explicitly, since titles.created_by is ON DELETE SET NULL.
create function public.delete_my_account() returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not signed in'; end if;
  -- Ratings first, so their delete trigger can still compute the voter hash and remove worldwide votes.
  delete from public.ratings where user_id = uid;
  delete from public.titles where created_by = uid and source = 'custom';
  delete from auth.users where id = uid;
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
