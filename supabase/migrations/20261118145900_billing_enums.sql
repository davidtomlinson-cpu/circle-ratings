-- New enum values must be committed before use, so they get their own migration.
create type public.plan_tier as enum ('individual', 'family', 'extended');
create type public.bill_period as enum ('month', 'year');
alter type public.notification_kind add value if not exists 'family_joined';
alter type public.notification_kind add value if not exists 'trial_ending';
