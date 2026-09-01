/**
 * Server-side reads for the Rooms & Zones subsystem — `zones` plus the
 * business-owned subset of `rooms` (extended by supabase/business-locations.sql
 * with branch_id/zone_id/room_type/capacity/tag/room_description). Uses the
 * service-role client the same way `lib/business/queries.ts` does —
 * visibility/ownership is enforced here in app code by always filtering on
 * the caller's own branchId. SERVER ONLY.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { getBranchCardSummaries } from "@/lib/business/queries";

export interface Zone {
  id: string;
  branchId: string;
  name: string;
  description: string | null;
  activeHoursStart: string | null;
  activeHoursEnd: string | null;
  status: "active" | "inactive";
  createdAt: string;
}

/**
 * A business room. `roomDescription` maps to `rooms.room_description` — named
 * to avoid colliding with the pre-existing `rooms.about` field (the consumer
 * room's free-text blurb), which this subsystem never reads or writes.
 */
export interface Room {
  id: string;
  branchId: string | null;
  zoneId: string | null;
  slug: string;
  name: string;
  roomType: string | null;
  capacity: number | null;
  tag: string | null;
  roomDescription: string | null;
  createdAt: string;
}

interface ZoneRow {
  id: string;
  branch_id: string;
  name: string;
  description: string | null;
  active_hours_start: string | null;
  active_hours_end: string | null;
  status: string;
  created_at: string;
}

function rowToZone(row: ZoneRow): Zone {
  return {
    id: row.id,
    branchId: row.branch_id,
    name: row.name,
    description: row.description,
    activeHoursStart: row.active_hours_start,
    activeHoursEnd: row.active_hours_end,
    status: row.status === "inactive" ? "inactive" : "active",
    createdAt: row.created_at,
  };
}

const ZONE_COLUMNS =
  "id, branch_id, name, description, active_hours_start, active_hours_end, status, created_at";

export async function listZones(branchId: string): Promise<Zone[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("zones")
    .select(ZONE_COLUMNS)
    .eq("branch_id", branchId)
    .order("created_at", { ascending: true });
  return ((data ?? []) as ZoneRow[]).map(rowToZone);
}

export async function getZone(
  branchId: string,
  zoneId: string,
): Promise<Zone | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("zones")
    .select(ZONE_COLUMNS)
    .eq("branch_id", branchId)
    .eq("id", zoneId)
    .maybeSingle();
  return data ? rowToZone(data as ZoneRow) : null;
}

interface RoomRow {
  id: string;
  branch_id: string | null;
  zone_id: string | null;
  slug: string;
  name: string;
  room_type: string | null;
  capacity: number | null;
  tag: string | null;
  room_description: string | null;
  created_at: string;
}

function rowToRoom(row: RoomRow): Room {
  return {
    id: row.id,
    branchId: row.branch_id,
    zoneId: row.zone_id,
    slug: row.slug,
    name: row.name,
    roomType: row.room_type,
    capacity: row.capacity,
    tag: row.tag,
    roomDescription: row.room_description,
    createdAt: row.created_at,
  };
}

const ROOM_COLUMNS =
  "id, branch_id, zone_id, slug, name, room_type, capacity, tag, room_description, created_at";

/** All business rooms belonging to a branch — the default room (branches.room_id) and any extra rooms. */
export async function listRooms(branchId: string): Promise<Room[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("rooms")
    .select(ROOM_COLUMNS)
    .eq("branch_id", branchId)
    .order("created_at", { ascending: true });
  return ((data ?? []) as RoomRow[]).map(rowToRoom);
}

export async function getRoom(
  branchId: string,
  roomId: string,
): Promise<Room | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("rooms")
    .select(ROOM_COLUMNS)
    .eq("branch_id", branchId)
    .eq("id", roomId)
    .maybeSingle();
  return data ? rowToRoom(data as RoomRow) : null;
}

/** Everything the Locations list/detail page needs, per branch, in one shape. */
export interface LocationSummary {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  timezone: string;
  status: "active" | "offline";
  rooms: number;
  screens: number;
  screensOnline: number;
  audioZones: number;
  contentSchedules: number;
  schedulesActive: boolean;
  lastSeenAt: string | null;
  createdAt: string;
}

/**
 * One bulk read for the whole Locations list — reuses `getBranchCardSummaries`
 * (branch + devices + online counts, already real) and adds room/audio-zone/
 * schedule counts the same way: one batched query per table across every
 * branch, grouped client-side, instead of N+1 per-branch queries.
 *
 * `contentSchedules`/`schedulesActive` only count schedules that target the
 * branch DIRECTLY (`schedule_target_locations`) — a schedule that only
 * targets one of the branch's zones/rooms isn't counted here. Schedules
 * itself isn't wired to a CRUD UI yet, so this undercount has no visible
 * inconsistency today; revisit once schedule creation is real.
 */
export async function listLocationSummaries(businessId: string): Promise<LocationSummary[]> {
  const summaries = await getBranchCardSummaries(businessId);
  if (!summaries.length) return [];

  const admin = createAdminClient();
  if (!admin) {
    return summaries.map((s) => toLocationSummary(s, 0, 0, 0, false));
  }

  const branchIds = summaries.map((s) => s.branch.id);

  const [{ data: roomRows }, { data: audioZoneRows }, { data: scheduleTargetRows }] =
    await Promise.all([
      admin.from("rooms").select("branch_id").in("branch_id", branchIds),
      admin.from("audio_zones").select("branch_id").in("branch_id", branchIds),
      admin
        .from("schedule_target_locations")
        .select("branch_id, schedules(status)")
        .in("branch_id", branchIds),
    ]);

  const roomCountByBranch = countByBranch(roomRows);
  const audioZoneCountByBranch = countByBranch(audioZoneRows);

  const scheduleCountByBranch = new Map<string, number>();
  const activeScheduleByBranch = new Set<string>();
  for (const row of (scheduleTargetRows ?? []) as {
    branch_id: string;
    schedules: { status: string } | { status: string }[] | null;
  }[]) {
    scheduleCountByBranch.set(row.branch_id, (scheduleCountByBranch.get(row.branch_id) ?? 0) + 1);
    const schedule = Array.isArray(row.schedules) ? row.schedules[0] : row.schedules;
    if (schedule?.status === "active") activeScheduleByBranch.add(row.branch_id);
  }

  return summaries.map((s) =>
    toLocationSummary(
      s,
      roomCountByBranch.get(s.branch.id) ?? 0,
      audioZoneCountByBranch.get(s.branch.id) ?? 0,
      scheduleCountByBranch.get(s.branch.id) ?? 0,
      activeScheduleByBranch.has(s.branch.id),
    ),
  );
}

function countByBranch(rows: { branch_id: string }[] | null): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows ?? []) {
    counts.set(row.branch_id, (counts.get(row.branch_id) ?? 0) + 1);
  }
  return counts;
}

function toLocationSummary(
  summary: Awaited<ReturnType<typeof getBranchCardSummaries>>[number],
  rooms: number,
  audioZones: number,
  contentSchedules: number,
  schedulesActive: boolean,
): LocationSummary {
  const { branch, devices, onlineDeviceCount, lastSeenAt } = summary;
  // BranchDevice doesn't expose device_kind (listBranchDevices/getBranchCardSummaries
  // only select id/name/paired_at/last_seen_at), and no real flow can create an
  // 'audio' kind device yet — every paired device today genuinely is a screen.
  return {
    id: branch.id,
    name: branch.name,
    slug: branch.slug,
    address: [branch.address, branch.city, branch.country].filter(Boolean).join(", ") || null,
    timezone: branch.timezone,
    status: onlineDeviceCount > 0 ? "active" : "offline",
    rooms,
    screens: devices.length,
    screensOnline: onlineDeviceCount,
    audioZones,
    contentSchedules,
    schedulesActive,
    lastSeenAt,
    createdAt: branch.createdAt,
  };
}
