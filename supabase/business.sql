-- ============================================================================
-- Tazama — Business dashboard + branch management schema
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to re-run: it is idempotent. Run AFTER schema.sql and rooms.sql.
-- ============================================================================

-- 1. Enums --------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'business_staff_role') then
    create type public.business_staff_role as enum ('admin', 'manager');
  end if;
end $$;

-- 2. rooms: link a room to the business that owns it (branch rooms) -----------
alter table public.rooms
  add column if not exists owner_business_id uuid references public.business_profiles (id) on delete cascade;
create index if not exists rooms_owner_business_idx
  on public.rooms (owner_business_id) where owner_business_id is not null;

-- 3. branches -------------------------------------------------------------------
create table if not exists public.branches (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references public.business_profiles (id) on delete cascade,
  room_id             uuid not null unique references public.rooms (id) on delete cascade,
  name                text not null,
  slug                text not null unique,
  device_paired_at    timestamptz,
  device_last_seen_at timestamptz,
  archived_at         timestamptz,
  created_at          timestamptz not null default now()
);
create index if not exists branches_business_idx on public.branches (business_id, created_at);

-- 4. business_staff ---------------------------------------------------------------
create table if not exists public.business_staff (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles (id) on delete cascade,
  email       text not null,
  user_id     uuid references auth.users (id) on delete cascade,
  role        public.business_staff_role not null default 'manager',
  invited_at  timestamptz not null default now(),
  accepted_at timestamptz,
  unique (business_id, email)
);
create index if not exists business_staff_user_idx on public.business_staff (user_id);

-- 5. business_staff_branches (manager scoping) -------------------------------------
create table if not exists public.business_staff_branches (
  staff_id  uuid not null references public.business_staff (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  primary key (staff_id, branch_id)
);

-- 6. device_pairings (short-lived pairing-code handshake) --------------------------
create table if not exists public.device_pairings (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,
  device_token      text not null unique,
  expires_at        timestamptz not null,
  claimed_branch_id uuid references public.branches (id) on delete set null,
  claimed_at        timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists device_pairings_token_idx on public.device_pairings (device_token);

-- 7. is_business_staff() helper (security-definer, avoids recursive RLS) -----------
create or replace function public.is_business_staff(
  p_business uuid, p_user uuid, p_branch uuid default null
) returns boolean language sql security definer stable set search_path = public as $$
  select
    p_business = p_user  -- the owner: business_profiles.id == the owning profile's id
    or exists (
      select 1 from public.business_staff s
      where s.business_id = p_business
        and s.user_id = p_user
        and s.accepted_at is not null
        and (
          s.role = 'admin'
          or (
            p_branch is not null
            and exists (
              select 1 from public.business_staff_branches sb
              where sb.staff_id = s.id and sb.branch_id = p_branch
            )
          )
        )
    );
$$;

-- 8. Row Level Security -------------------------------------------------------------
alter table public.branches                enable row level security;
alter table public.business_staff          enable row level security;
alter table public.business_staff_branches enable row level security;

drop policy if exists "branches_select" on public.branches;
create policy "branches_select" on public.branches for select using (
  public.is_business_staff(business_id, auth.uid())
);

drop policy if exists "business_staff_select" on public.business_staff;
create policy "business_staff_select" on public.business_staff for select using (
  public.is_business_staff(business_id, auth.uid()) or user_id = auth.uid()
);

drop policy if exists "business_staff_branches_select" on public.business_staff_branches;
create policy "business_staff_branches_select" on public.business_staff_branches for select using (
  exists (
    select 1 from public.business_staff s
    where s.id = staff_id and public.is_business_staff(s.business_id, auth.uid())
  )
);

-- All writes to branches/business_staff/business_staff_branches/device_pairings go
-- through the service-role client (see lib/business/*), which bypasses RLS; ownership
-- is enforced in app code the same way existing `rooms` writes are (app/rooms/actions.ts).
-- These SELECT policies only matter if a client component ever reads these tables
-- directly with the anon key.

-- 9. rooms/room_playback: let business staff control their branch's room -----------
drop policy if exists "rooms_select" on public.rooms;
create policy "rooms_select" on public.rooms for select using (
  access = 'public'
  or host_id = auth.uid()
  or public.is_room_member(id, auth.uid())
  or (owner_business_id is not null and public.is_business_staff(owner_business_id, auth.uid()))
);

drop policy if exists "playback_update_host" on public.room_playback;
create policy "playback_update_host" on public.room_playback for update using (
  public.is_room_host(room_id, auth.uid())
  or exists (
    select 1 from public.rooms r
    where r.id = room_id and r.owner_business_id is not null
      and public.is_business_staff(
        r.owner_business_id, auth.uid(),
        (select id from public.branches where room_id = r.id)
      )
  )
) with check (
  public.is_room_host(room_id, auth.uid())
  or exists (
    select 1 from public.rooms r
    where r.id = room_id and r.owner_business_id is not null
      and public.is_business_staff(
        r.owner_business_id, auth.uid(),
        (select id from public.branches where room_id = r.id)
      )
  )
);
