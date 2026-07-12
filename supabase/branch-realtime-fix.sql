-- ============================================================================
-- Tazama — Branch realtime + RLS fix
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to re-run: it is idempotent. Run AFTER business.sql and branch-controls.sql.
--
-- Fixes a gap discovered while building remote branch volume control: the
-- anonymous kiosk client (no auth.uid()) could never actually receive
-- Postgres Changes events for a branch's room_playback or branches rows,
-- because can_view_room() only allows public/host/member access — a branch
-- room is 'private' with no members, so RLS silently dropped every event for
-- the exact anonymous kiosk connection this whole feature depends on. This
-- also affects the already-shipped kiosk auto-advance/mirroring feature.
-- ============================================================================

-- 1. Let a branch room's playback be visible to anyone (branches are
--    "unlisted but shareable by direct link", same reasoning already applied
--    to the room page's own private-access bypass for branches).
create or replace function public.can_view_room(p_room uuid, p_user uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.rooms r
    where r.id = p_room
      and (
        r.access = 'public'
        or r.host_id = p_user
        or r.owner_business_id is not null
        or exists (select 1 from public.room_members m
                   where m.room_id = r.id and m.user_id = p_user)
      )
  );
$$;

-- 2. branches: add a public SELECT policy (non-sensitive metadata — name,
--    slug, volume, pairing timestamps; no staff/business financial data) so
--    an anonymous kiosk can read+subscribe to its own branch's volume.
drop policy if exists "branches_select_public" on public.branches;
create policy "branches_select_public" on public.branches for select using (true);

-- 3. Add branches to the realtime publication (rooms/room_playback/etc were
--    already added in rooms.sql; branches never was, until now).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'branches'
  ) then
    execute 'alter publication supabase_realtime add table public.branches';
  end if;
end $$;
