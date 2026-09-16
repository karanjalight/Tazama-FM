/**
 * Which playback source is actually driving a room right now, and every room
 * that source plays in. Mirrors the kiosk's own priority (active schedule
 * session > synchronized audio zone > the room itself — see
 * kiosk-room-player.tsx) so a Pair request is always claimed by the source
 * the requester's screen is really following. SERVER ONLY.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { getScheduleTargetsByIds, listActiveSchedulesCoveringRoom } from "@/lib/business/schedule-queries";
import { currentHHMMInTimezone, resolveCurrentSession } from "@/lib/business/schedule-session-resolver";
import { getSynchronizedZoneForRoom } from "@/lib/business/audio-zone-queries";
import type { ScheduleSession } from "@/lib/business/schedule-types";
import type { PairSource } from "@/lib/pair/types";

export type RoomSource =
  | { kind: "schedule"; id: string; session: ScheduleSession }
  | { kind: "zone"; id: string }
  | { kind: "room"; id: string };

export async function resolveRoomSource(roomId: string): Promise<RoomSource> {
  const schedules = await listActiveSchedulesCoveringRoom(roomId);
  for (const schedule of schedules) {
    const session = resolveCurrentSession(schedule.sessions, currentHHMMInTimezone(schedule.timezone));
    if (session) return { kind: "schedule", id: schedule.id, session };
  }
  const zone = await getSynchronizedZoneForRoom(roomId);
  if (zone) return { kind: "zone", id: zone.id };
  return { kind: "room", id: roomId };
}

/** Every room a schedule covers — the same four routes (direct room, location
 * zone, branch, specific screen) `listActiveSchedulesCoveringRoom` checks in
 * the other direction, so the two can never disagree about coverage. */
async function scheduleRoomIds(admin: SupabaseClient, scheduleId: string): Promise<string[]> {
  const targets = (await getScheduleTargetsByIds([scheduleId])).get(scheduleId);
  if (!targets) return [];

  const [viaBranch, viaZone, viaScreen] = await Promise.all([
    targets.branchIds.length
      ? admin.from("rooms").select("id").in("branch_id", targets.branchIds)
      : Promise.resolve({ data: [] as { id: string }[] }),
    targets.zoneIds.length
      ? admin.from("rooms").select("id").in("zone_id", targets.zoneIds)
      : Promise.resolve({ data: [] as { id: string }[] }),
    targets.deviceIds.length
      ? admin.from("branch_devices").select("room_id").in("id", targets.deviceIds)
      : Promise.resolve({ data: [] as { room_id: string | null }[] }),
  ]);

  const ids = new Set(targets.roomIds);
  for (const row of (viaBranch.data ?? []) as { id: string }[]) ids.add(row.id);
  for (const row of (viaZone.data ?? []) as { id: string }[]) ids.add(row.id);
  for (const row of (viaScreen.data ?? []) as { room_id: string | null }[]) {
    if (row.room_id) ids.add(row.room_id);
  }
  return [...ids];
}

async function zoneRoomIds(admin: SupabaseClient, zoneId: string): Promise<string[]> {
  const { data } = await admin.from("audio_zone_rooms").select("room_id").eq("audio_zone_id", zoneId);
  return ((data ?? []) as { room_id: string }[]).map((row) => row.room_id);
}

/** Rooms whose guests' requests this source plays. */
export async function sourceRoomIds(admin: SupabaseClient, source: PairSource): Promise<string[]> {
  if (source.kind === "schedule") return scheduleRoomIds(admin, source.id);
  if (source.kind === "zone") return zoneRoomIds(admin, source.id);
  return [source.id];
}
