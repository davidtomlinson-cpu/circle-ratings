-- Short descriptions for titles (opening of the English Wikipedia article), fetched on demand by the
-- catalogue function and cached here for 30 days. summary = '' means "looked, nothing usable" (rechecked after 7 days).
-- Wikipedia text is CC BY-SA 4.0: the app shows it with credit and a link (url).
create table public.title_descriptions (
  title_id bigint primary key references public.titles (id) on delete cascade,
  summary text not null check (char_length(summary) <= 600),
  url text,
  fetched_at timestamptz not null default now()
);
alter table public.title_descriptions enable row level security; -- no policies: read and written by the catalogue function
revoke all on public.title_descriptions from anon, authenticated;
