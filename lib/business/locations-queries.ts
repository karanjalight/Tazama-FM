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
