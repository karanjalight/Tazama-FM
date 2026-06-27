-- ============================================================================
-- Tazama — auth schema
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to re-run: it is idempotent.
-- ============================================================================

-- 1. Account type ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'account_type') then
    create type public.account_type as enum ('individual', 'business');
  end if;
end $$;

-- 2. profiles (1:1 with auth.users) ------------------------------------------
create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  full_name           text not null default '',
  phone               text,
  account_type        public.account_type,
  avatar_key          text,
  onboarding_complete boolean not null default false,
  created_at          timestamptz not null default now()
);

-- 3. business_profiles (1:1 with profiles, business accounts only) -----------
create table if not exists public.business_profiles (
  id             uuid primary key references public.profiles (id) on delete cascade,
  business_name  text not null,
  business_phone text not null,
  industry       text not null,
  created_at     timestamptz not null default now()
);

-- 4. Row Level Security ------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.business_profiles enable row level security;

-- profiles: a user may read/insert/update only their own row.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- business_profiles: same ownership rule (id == the owning user's id).
drop policy if exists "business_select_own" on public.business_profiles;
create policy "business_select_own" on public.business_profiles
  for select using (auth.uid() = id);

drop policy if exists "business_insert_own" on public.business_profiles;
create policy "business_insert_own" on public.business_profiles
  for insert with check (auth.uid() = id);

drop policy if exists "business_update_own" on public.business_profiles;
create policy "business_update_own" on public.business_profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- 5. Auto-create a profile row whenever an auth user is created --------------
-- Runs as the table owner (security definer) so it bypasses RLS on insert.
-- Seeds name/phone from the signup metadata; the wizard fills in the rest.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    ),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Tazama — music & genre preferences
-- (Genre-preference signup step + genre-populated dashboard.)
-- Safe to re-run; idempotent.
-- ============================================================================

-- 6. Genre preferences on the profile ----------------------------------------
-- Multi-select from the signup wizard, e.g. {'afrobeats','amapiano','gospel'}.
alter table public.profiles
  add column if not exists genre_preferences text[] not null default '{}';

-- 7. tracks — the shared music catalog (METADATA ONLY; YouTube is the CDN) ----
-- One row per playable YouTube video, tagged with a single genre. Seeded
-- server-side by /api/tracks/seed (read-through cache) — never from the client.
create table if not exists public.tracks (
  id            uuid primary key default gen_random_uuid(),
  youtube_id    text not null unique,
  title         text not null,
  artist        text,                       -- YouTube channel title
  genre         text not null,
  thumbnail_url text,
  is_playable   boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Hot path: "playable tracks for this genre, newest first".
create index if not exists tracks_genre_playable_idx
  on public.tracks (genre, created_at desc)
  where is_playable;

-- 8. tracks Row Level Security -----------------------------------------------
-- The catalog is shared: any signed-in user may READ it. Writes happen only via
-- the seed route using the service-role key (which bypasses RLS), so there is
-- deliberately NO insert/update/delete policy for normal users.
alter table public.tracks enable row level security;

drop policy if exists "tracks_select_authed" on public.tracks;
create policy "tracks_select_authed" on public.tracks
  for select using (auth.role() = 'authenticated');
