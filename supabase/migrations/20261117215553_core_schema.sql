-- Circle Ratings core schema.
create type public.title_category as enum ('Movies', 'TV shows', 'Books', 'Albums');
create type public.title_source as enum ('top50', 'extra', 'custom');
create type public.list_visibility as enum ('all', 'some', 'locked');

-- Helpers live in a schema the API does not expose.
create schema if not exists private;

-- Profiles ----------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  visibility public.list_visibility not null default 'all',
  contribute_worldwide boolean not null default true,
  notify_circle boolean not null default true,
  remind_billing boolean not null default true,
  created_at timestamptz not null default now()
);

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(left(new.raw_user_meta_data ->> 'name', 60), ''));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

-- Catalogue ---------------------------------------------------------------
-- `key` keeps the prototype's ids (Movies#3, E#2) so the app can migrate local data.
-- External ids are filled in when the real catalogue lands, so ratings of the same title merge.
create table public.titles (
  id bigint generated always as identity primary key,
  key text not null unique,
  category public.title_category not null,
  title text not null check (char_length(title) between 1 and 200),
  creator text not null default '' check (char_length(creator) <= 200),
  year text not null default '' check (char_length(year) <= 20),
  source public.title_source not null,
  top50_rank smallint check (top50_rank between 1 and 50),
  tmdb_id text,
  openlibrary_id text,
  musicbrainz_id text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index titles_category_idx on public.titles (category);
create index titles_created_by_idx on public.titles (created_by);

-- Circle ------------------------------------------------------------------
-- Directed rows; accepting an invite inserts both directions (via RPC, later).
create table public.circle_members (
  owner_id uuid not null references auth.users (id) on delete cascade,
  member_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, member_id),
  check (owner_id <> member_id)
);
create index circle_members_member_idx on public.circle_members (member_id);

-- "Only people I choose"
create table public.visibility_grants (
  owner_id uuid not null references auth.users (id) on delete cascade,
  viewer_id uuid not null references auth.users (id) on delete cascade,
  primary key (owner_id, viewer_id)
);
create index visibility_grants_viewer_idx on public.visibility_grants (viewer_id);

create function private.in_circle(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.circle_members where owner_id = a and member_id = b);
$$;

-- Can `viewer` see `owner`'s list?
create function private.can_view(owner uuid, viewer uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select owner = viewer or (
    private.in_circle(owner, viewer) and exists (
      select 1 from public.profiles p where p.id = owner and (
        p.visibility = 'all'
        or (p.visibility = 'some' and exists (
          select 1 from public.visibility_grants g where g.owner_id = owner and g.viewer_id = viewer))
      )
    )
  );
$$;

-- Watchlist & ratings -----------------------------------------------------
create table public.watchlist (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title_id bigint not null references public.titles (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (user_id, title_id)
);
create index watchlist_title_idx on public.watchlist (title_id);

create table public.ratings (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title_id bigint not null references public.titles (id) on delete cascade,
  hearts smallint not null check (hearts between 1 and 5),
  from_watchlist boolean not null default false, -- set by trigger, never by the client
  rated_at timestamptz not null default now(),
  primary key (user_id, title_id)
);
create index ratings_title_idx on public.ratings (title_id);
create index ratings_user_rated_idx on public.ratings (user_id, rated_at desc);

-- Comments (visible to the author's circle) -------------------------------
create table public.comments (
  id bigint generated always as identity primary key,
  title_id bigint not null references public.titles (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index comments_title_idx on public.comments (title_id, created_at);
create index comments_author_idx on public.comments (author_id);

-- Loved worldwide ---------------------------------------------------------
-- Anonymous: no user id is stored, only a salted hash so each person counts once per title.
create table private.worldwide_salt (salt text not null);
insert into private.worldwide_salt values (encode(extensions.gen_random_bytes(32), 'hex'));

create table public.worldwide_loves (
  title_id bigint not null references public.titles (id) on delete cascade,
  voter_hash text not null,
  created_at timestamptz not null default now(),
  primary key (title_id, voter_hash)
);
create index worldwide_loves_created_idx on public.worldwide_loves (created_at);

create function private.voter_hash(uid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select encode(extensions.digest(uid::text || (select salt from private.worldwide_salt limit 1), 'sha256'), 'hex');
$$;
