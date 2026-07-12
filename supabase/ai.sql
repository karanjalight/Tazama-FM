-- ============================================================================
-- Tazama — AI concierge (premium chat + playlists)
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to re-run: it is idempotent.
--
-- Pairs with supabase/schema.sql (auth + tracks) and supabase/rooms.sql
-- (rooms + subscriptions). Adds the read-through resolver cache, the AI premium
-- entitlement, chat threads/messages, and playlists. All per-user tables key on
-- user_id -> auth.users, so they require a real Supabase session (set
-- NEXT_PUBLIC_DEMO_AUTH=false to exercise the AI features end-to-end).
-- ============================================================================

-- 1. track_cache — read-through cache for the YouTube resolver ----------------
-- Keyed by a normalised "{artist}|{title}" query so resolveTrack() can skip the
-- YouTube Data API on a repeat lookup. Written ONLY by the server (service-role
-- client) and never read from the browser, so RLS is on with no public policy.
create table if not exists public.track_cache (
  cache_key     text primary key,            -- lowercased "{artist}|{title}"
  video_id      text not null,
  title         text not null,
  channel_title text,
  thumbnail     text,
  created_at    timestamptz not null default now()
);

alter table public.track_cache enable row level security;
-- (No policy by design: only the service-role key, which bypasses RLS, touches this.)

-- 2. premium_access — per-user AI entitlement (the $3 tier) -------------------
-- Written ONLY by the Paystack webhook via the service-role client. Users may
-- read their own row (so usePremium() can reflect status) but never write it.
create table if not exists public.premium_access (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  status     text not null default 'inactive',  -- active | inactive | cancelled
  expires_at timestamptz,                        -- null = no expiry
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.premium_access enable row level security;

drop policy if exists "premium_select_own" on public.premium_access;
create policy "premium_select_own" on public.premium_access
  for select using (auth.uid() = user_id);
-- No insert/update/delete policy: writes happen only via the service-role webhook.

-- 3. chat_threads — one row per concierge conversation -----------------------
create table if not exists public.chat_threads (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists chat_threads_user_idx
  on public.chat_threads (user_id, created_at desc);

alter table public.chat_threads enable row level security;

drop policy if exists "chat_threads_select_own" on public.chat_threads;
create policy "chat_threads_select_own" on public.chat_threads
  for select using (auth.uid() = user_id);
drop policy if exists "chat_threads_insert_own" on public.chat_threads;
create policy "chat_threads_insert_own" on public.chat_threads
  for insert with check (auth.uid() = user_id);
drop policy if exists "chat_threads_update_own" on public.chat_threads;
create policy "chat_threads_update_own" on public.chat_threads
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "chat_threads_delete_own" on public.chat_threads;
create policy "chat_threads_delete_own" on public.chat_threads
  for delete using (auth.uid() = user_id);

-- 4. chat_messages — messages within a thread --------------------------------
-- content jsonb holds the rendered turn: prose text blocks plus any tool calls
-- and resolved track cards, so a thread can be replayed without re-resolving.
create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references public.chat_threads (id) on delete cascade,
  role       text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_thread_idx
  on public.chat_messages (thread_id, created_at);

alter table public.chat_messages enable row level security;

-- A user may touch messages only in threads they own.
drop policy if exists "chat_messages_select_own" on public.chat_messages;
create policy "chat_messages_select_own" on public.chat_messages
  for select using (
    exists (select 1 from public.chat_threads t
            where t.id = thread_id and t.user_id = auth.uid())
  );
drop policy if exists "chat_messages_insert_own" on public.chat_messages;
create policy "chat_messages_insert_own" on public.chat_messages
  for insert with check (
    exists (select 1 from public.chat_threads t
            where t.id = thread_id and t.user_id = auth.uid())
  );
drop policy if exists "chat_messages_delete_own" on public.chat_messages;
create policy "chat_messages_delete_own" on public.chat_messages
  for delete using (
    exists (select 1 from public.chat_threads t
            where t.id = thread_id and t.user_id = auth.uid())
  );

-- 5. playlists ---------------------------------------------------------------
create table if not exists public.playlists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  mood       text,
  created_at timestamptz not null default now()
);

create index if not exists playlists_user_idx
  on public.playlists (user_id, created_at desc);

alter table public.playlists enable row level security;

drop policy if exists "playlists_select_own" on public.playlists;
create policy "playlists_select_own" on public.playlists
  for select using (auth.uid() = user_id);
drop policy if exists "playlists_insert_own" on public.playlists;
create policy "playlists_insert_own" on public.playlists
  for insert with check (auth.uid() = user_id);
drop policy if exists "playlists_update_own" on public.playlists;
create policy "playlists_update_own" on public.playlists
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "playlists_delete_own" on public.playlists;
create policy "playlists_delete_own" on public.playlists
  for delete using (auth.uid() = user_id);

-- 6. playlist_tracks ---------------------------------------------------------
create table if not exists public.playlist_tracks (
  id          uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  video_id    text not null,
  title       text not null,
  artist      text,
  position    int not null default 0,
  added_at    timestamptz not null default now()
);

create index if not exists playlist_tracks_playlist_idx
  on public.playlist_tracks (playlist_id, position);

alter table public.playlist_tracks enable row level security;

-- A user may touch tracks only in playlists they own.
drop policy if exists "playlist_tracks_select_own" on public.playlist_tracks;
create policy "playlist_tracks_select_own" on public.playlist_tracks
  for select using (
    exists (select 1 from public.playlists p
            where p.id = playlist_id and p.user_id = auth.uid())
  );
drop policy if exists "playlist_tracks_insert_own" on public.playlist_tracks;
create policy "playlist_tracks_insert_own" on public.playlist_tracks
  for insert with check (
    exists (select 1 from public.playlists p
            where p.id = playlist_id and p.user_id = auth.uid())
  );
drop policy if exists "playlist_tracks_update_own" on public.playlist_tracks;
create policy "playlist_tracks_update_own" on public.playlist_tracks
  for update using (
    exists (select 1 from public.playlists p
            where p.id = playlist_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.playlists p
            where p.id = playlist_id and p.user_id = auth.uid())
  );
drop policy if exists "playlist_tracks_delete_own" on public.playlist_tracks;
create policy "playlist_tracks_delete_own" on public.playlist_tracks
  for delete using (
    exists (select 1 from public.playlists p
            where p.id = playlist_id and p.user_id = auth.uid())
  );
