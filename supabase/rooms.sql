-- ============================================================================
-- Tazama — Rooms (live listening) + subscriptions schema
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to re-run: it is idempotent. Run AFTER schema.sql.
-- ============================================================================

-- 1. Enums -------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'room_access') then
    create type public.room_access as enum ('public', 'private');
  end if;
  if not exists (select 1 from pg_type where typname = 'subscription_plan') then
    create type public.subscription_plan as enum ('free', 'individual', 'business');
  end if;
end $$;

-- 2. rooms -------------------------------------------------------------------
create table if not exists public.rooms (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  host_id     uuid not null references public.profiles (id) on delete cascade,
  name        text not null,
  about       text not null default '',
  access      public.room_access not null default 'public',
  genres      text[] not null default '{}',   -- room "tags" from the big catalog
  is_live     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists rooms_host_idx on public.rooms (host_id, created_at desc);
create index if not exists rooms_live_public_idx
  on public.rooms (is_live, created_at desc) where access = 'public';

-- 3. room_members (host + listeners; powers private-room access) -------------
create table if not exists public.room_members (
  room_id   uuid not null references public.rooms (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role      text not null default 'listener',   -- 'host' | 'listener'
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- 4. room_playback (one durable snapshot per room, for late-joiners) ---------
create table if not exists public.room_playback (
  room_id            uuid primary key references public.rooms (id) on delete cascade,
  track              jsonb,                       -- {youtubeId,title,artist,thumbnailUrl} | null
  position_ms        integer not null default 0,
  is_playing         boolean not null default false,
  listening_ms_total bigint  not null default 0,  -- free-tier 2h cap accounting
  updated_at         timestamptz not null default now()
);

-- 5. room_queue (collaborative up-next) --------------------------------------
create table if not exists public.room_queue (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms (id) on delete cascade,
  track      jsonb not null,                      -- {youtubeId,title,artist,thumbnailUrl}
  added_by   uuid references public.profiles (id) on delete set null,
  played     boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists room_queue_room_idx on public.room_queue (room_id, created_at);

-- 6. room_track_likes (upvotes that reorder the queue + feed suggestions) -----
create table if not exists public.room_track_likes (
  queue_id   uuid not null references public.room_queue (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  room_id    uuid not null references public.rooms (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (queue_id, user_id)
);
create index if not exists room_track_likes_room_idx on public.room_track_likes (room_id);

-- 7. subscriptions (account-level plan; written by the Paystack webhook) ------
create table if not exists public.subscriptions (
  account_id                 uuid primary key references public.profiles (id) on delete cascade,
  plan                       public.subscription_plan not null default 'free',
  status                     text not null default 'active',  -- active|cancelled|past_due
  paystack_customer_code     text,
  paystack_subscription_code text,
  current_period_end         timestamptz,
  updated_at                 timestamptz not null default now()
);

-- 8. Security-definer helpers (avoid recursive RLS between rooms/members) -----
create or replace function public.is_room_host(p_room uuid, p_user uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.rooms where id = p_room and host_id = p_user);
$$;

create or replace function public.is_room_member(p_room uuid, p_user uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.room_members where room_id = p_room and user_id = p_user);
$$;

create or replace function public.can_view_room(p_room uuid, p_user uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.rooms r
    where r.id = p_room
      and (
        r.access = 'public'
        or r.host_id = p_user
        or exists (select 1 from public.room_members m
                   where m.room_id = r.id and m.user_id = p_user)
      )
  );
$$;

-- 9. Row Level Security ------------------------------------------------------
alter table public.rooms             enable row level security;
alter table public.room_members      enable row level security;
alter table public.room_playback     enable row level security;
alter table public.room_queue        enable row level security;
alter table public.room_track_likes  enable row level security;
alter table public.subscriptions     enable row level security;

-- rooms
drop policy if exists "rooms_select" on public.rooms;
create policy "rooms_select" on public.rooms for select using (
  access = 'public' or host_id = auth.uid() or public.is_room_member(id, auth.uid())
);
drop policy if exists "rooms_insert_own" on public.rooms;
create policy "rooms_insert_own" on public.rooms for insert with check (host_id = auth.uid());
drop policy if exists "rooms_update_own" on public.rooms;
create policy "rooms_update_own" on public.rooms for update using (host_id = auth.uid()) with check (host_id = auth.uid());
drop policy if exists "rooms_delete_own" on public.rooms;
create policy "rooms_delete_own" on public.rooms for delete using (host_id = auth.uid());

-- room_members
drop policy if exists "members_select" on public.room_members;
create policy "members_select" on public.room_members for select using (
  user_id = auth.uid() or public.is_room_host(room_id, auth.uid())
);
drop policy if exists "members_insert_self" on public.room_members;
create policy "members_insert_self" on public.room_members for insert with check (
  user_id = auth.uid() and public.can_view_room(room_id, auth.uid())
);
drop policy if exists "members_delete" on public.room_members;
create policy "members_delete" on public.room_members for delete using (
  user_id = auth.uid() or public.is_room_host(room_id, auth.uid())
);

-- room_playback
drop policy if exists "playback_select" on public.room_playback;
create policy "playback_select" on public.room_playback for select using (
  public.can_view_room(room_id, auth.uid())
);
drop policy if exists "playback_insert_host" on public.room_playback;
create policy "playback_insert_host" on public.room_playback for insert with check (
  public.is_room_host(room_id, auth.uid())
);
drop policy if exists "playback_update_host" on public.room_playback;
create policy "playback_update_host" on public.room_playback for update using (
  public.is_room_host(room_id, auth.uid())
) with check (public.is_room_host(room_id, auth.uid()));

-- room_queue
drop policy if exists "queue_select" on public.room_queue;
create policy "queue_select" on public.room_queue for select using (
  public.can_view_room(room_id, auth.uid())
);
drop policy if exists "queue_insert_member" on public.room_queue;
create policy "queue_insert_member" on public.room_queue for insert with check (
  added_by = auth.uid() and public.can_view_room(room_id, auth.uid())
);
drop policy if exists "queue_update_host" on public.room_queue;
create policy "queue_update_host" on public.room_queue for update using (
  public.is_room_host(room_id, auth.uid())
) with check (public.is_room_host(room_id, auth.uid()));
drop policy if exists "queue_delete" on public.room_queue;
create policy "queue_delete" on public.room_queue for delete using (
  added_by = auth.uid() or public.is_room_host(room_id, auth.uid())
);

-- room_track_likes
drop policy if exists "likes_select" on public.room_track_likes;
create policy "likes_select" on public.room_track_likes for select using (
  public.can_view_room(room_id, auth.uid())
);
drop policy if exists "likes_insert_self" on public.room_track_likes;
create policy "likes_insert_self" on public.room_track_likes for insert with check (
  user_id = auth.uid()
);
drop policy if exists "likes_delete_self" on public.room_track_likes;
create policy "likes_delete_self" on public.room_track_likes for delete using (
  user_id = auth.uid()
);

-- subscriptions (read your own; the webhook writes via the service-role key)
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions for select using (
  account_id = auth.uid()
);

-- 10. Realtime publication (postgres_changes for queue/likes/playback) -------
do $$
declare
  t text;
begin
  foreach t in array array['rooms','room_playback','room_queue','room_track_likes']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
