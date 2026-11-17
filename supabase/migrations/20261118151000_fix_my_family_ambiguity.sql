-- Applied as a follow-up on the live project; the billing migration above already includes it.
create or replace function public.my_family()
returns table (slot smallint, code text, member_id uuid, member_name text, joined_at timestamptz, places int, active boolean)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  s public.subscriptions;
  n int;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into s from public.subscriptions where user_id = uid;
  if s.user_id is null or s.tier = 'individual' then return; end if;
  n := private.places(s.tier);
  for i in 1 .. n - 1 loop
    loop
      begin
        insert into public.family_slots (owner_id, slot, code) values (uid, i, private.new_family_code()) on conflict (owner_id, slot) do nothing;
        exit;
      exception when unique_violation then -- code clash, retry
      end;
    end loop;
  end loop;
  return query
    select f.slot, f.code, f.member_id, coalesce(nullif(p.display_name, ''), 'Someone'), f.joined_at, n, s.expires_at > now()
    from public.family_slots f left join public.profiles p on p.id = f.member_id
    where f.owner_id = uid and f.slot < n
    order by f.slot;
end $$;

