-- People can delete their own notifications (one at a time, or clear all).
create policy "notifications: delete own" on public.notifications for delete to authenticated using (user_id = (select auth.uid()));
grant delete on public.notifications to authenticated;
