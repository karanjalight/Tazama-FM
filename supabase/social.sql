-- Tazama — Social layer: play history, conversations/messages, gamification, blocks.
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to re-run: it is idempotent. Run AFTER schema.sql, rooms.sql, ai.sql, likes.sql.

-- 1. play_history -------------------------------------------------------------
-- One row per track-start (not per progress tick). Denormalized track fields —
-- same reasoning as liked_tracks: a play can happen from a room where no
-- catalog `tracks.id` exists.
create table if not exists public.play_history (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  youtube_id    text not null,
  title         text not null,
  artist        text,
  thumbnail_url text,
  source        text not null default 'dashboard'
                check (source in ('dashboard', 'room', 'chat')),
  played_at     timestamptz not null default now()
);
create index if not exists play_history_user_idx
  on public.play_history (user_id, played_at desc);
create index if not exists play_history_played_at_idx
  on public.play_history (played_at desc);

alter table public.play_history enable row level security;

-- security definer: play_history_select's cross-table check (profiles,
-- blocked_users) would otherwise be re-filtered by those tables' own RLS
-- policies inside the subquery — profiles only allows `auth.uid() = id`, so a
-- plain exists(...) subquery could never see another user's row and the
-- policy would silently collapse to "only see your own play_history".
create or replace function public.play_history_is_visible(target_user_id uuid, viewer_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = target_user_id and p.activity_public = true
  )
  and not exists (
    select 1 from public.blocked_users b
    where (b.blocker_id = viewer_id and b.blocked_id = target_user_id)
       or (b.blocker_id = target_user_id and b.blocked_id = viewer_id)
  );
$$;

drop policy if exists "play_history_select" on public.play_history;
create policy "play_history_select" on public.play_history
  for select using (
    auth.uid() = user_id
    or public.play_history_is_visible(play_history.user_id, auth.uid())
  );
-- No insert/update/delete policy: writes go through the service-role admin
-- client only, which bypasses RLS entirely.

-- 2. profiles.activity_public --------------------------------------------------
alter table public.profiles
  add column if not exists activity_public boolean not null default true;

-- 3. blocked_users --------------------------------------------------------------
create table if not exists public.blocked_users (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

alter table public.blocked_users enable row level security;

drop policy if exists "blocked_users_select_own" on public.blocked_users;
create policy "blocked_users_select_own" on public.blocked_users
  for select using (auth.uid() = blocker_id);

-- 4. conversations + participants + messages (used by Plan 2) -------------------
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('dm', 'group')),
  name       text,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  joined_at       timestamptz not null default now(),
  last_read_at    timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists conversation_participants_user_idx
  on public.conversation_participants (user_id);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references auth.users (id) on delete cascade,
  kind            text not null check (kind in ('text', 'track')),
  body            text,
  youtube_id      text,
  title           text,
  artist          text,
  thumbnail_url   text,
  created_at      timestamptz not null default now()
);
create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

drop policy if exists "conversations_select_participant" on public.conversations;
create policy "conversations_select_participant" on public.conversations
  for select using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversations.id and cp.user_id = auth.uid()
    )
  );

drop policy if exists "participants_select_participant" on public.conversation_participants;
drop policy if exists "participants_select_own" on public.conversation_participants;
create policy "participants_select_own" on public.conversation_participants
  for select using (user_id = auth.uid());

drop policy if exists "messages_select_participant" on public.messages;
create policy "messages_select_participant" on public.messages
  for select using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );
-- No client insert/update/delete policies on any of the three — the service-role
-- admin client (Plan 2's server actions) owns every write, with membership and
-- block checks enforced in app code before it writes.

-- 5. point_events + user_badges (used by Plan 3) --------------------------------
create table if not exists public.point_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  event_type text not null,
  points     integer not null,
  ref_id     text,
  created_at timestamptz not null default now()
);
create index if not exists point_events_user_idx on public.point_events (user_id);
-- Dedup guard for Plan 3 (gamification): awarding logic upserts with a
-- deterministic ref_id (e.g. "<youtubeId>:<day>" for a play, a message id for
-- a shared-track-played event) so a replay/retry can never double-award.
create unique index if not exists point_events_dedup_idx
  on public.point_events (user_id, event_type, ref_id);

create table if not exists public.user_badges (
  user_id    uuid not null references auth.users (id) on delete cascade,
  badge_key  text not null,
  earned_at  timestamptz not null default now(),
  primary key (user_id, badge_key)
);

alter table public.point_events enable row level security;
alter table public.user_badges enable row level security;

drop policy if exists "point_events_select_all" on public.point_events;
create policy "point_events_select_all" on public.point_events
  for select using (true); -- leaderboard needs every user's totals readable

drop policy if exists "user_badges_select_all" on public.user_badges;
create policy "user_badges_select_all" on public.user_badges
  for select using (true); -- badges shown on any public profile
