/**
 * Server-side reads for the real Audio Zones management page
 * (supabase/business-audio-zones.sql). Uses the service-role client the
 * same way `lib/business/announcement-queries.ts` does — visibility is
 * enforced here in app code by always filtering on the caller's own
 * branchId. SERVER ONLY.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { isOnline } from "@/lib/business/queries";
import { listZones, listRooms, type Zone, type Room } from "@/lib/business/locations-queries";
import type { AudioZone } from "@/lib/business/audio-zone-types";

interface AudioZoneRow {
  id: string;
  branch_id: string;
  zone_id: string | null;
  name: string;
  description: string | null;
  status: string;
  volume: number;
  volume_limit: number;
  crossfade_seconds: number;
  audio_ducking_enabled: boolean;
  announcements_enabled: boolean;
  default_playlist_id: string | null;
  schedule_start: string | null;
  schedule_end: string | null;
  created_at: string;
}

const AUDIO_ZONE_COLUMNS =
  "id, branch_id, zone_id, name, description, status, volume, volume_limit, crossfade_seconds, audio_ducking_enabled, announcements_enabled, default_playlist_id, schedule_start, schedule_end, created_at";

/** Truncates a `time` column's "HH:MM:SS" to "HH:MM" for the UI's <input type="time">. */
function shortTime(value: string | null): string | null {
  return value ? value.slice(0, 5) : null;
}

async function roomsByAudioZone(
  admin: SupabaseClient,
  audioZoneIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (!audioZoneIds.length) return map;
  const { data } = await admin
    .from("audio_zone_rooms")
    .select("audio_zone_id, room_id")
    .in("audio_zone_id", audioZoneIds);
  for (const row of (data ?? []) as { audio_zone_id: string; room_id: string }[]) {
    const list = map.get(row.audio_zone_id) ?? [];
    list.push(row.room_id);
    map.set(row.audio_zone_id, list);
  }
  return map;
}

async function playlistNames(
  admin: SupabaseClient,
  playlistIds: string[],
): Promise<Map<string, string>> {
  if (!playlistIds.length) return new Map();
  const { data } = await admin
    .from("business_playlists")
    .select("id, name")
    .in("id", playlistIds);
  return new Map(((data ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]));
}

/** Real speaker (device_kind='audio') counts per room for a branch. */
async function speakerCountsByRoom(
  admin: SupabaseClient,
  branchId: string,
): Promise<Map<string, { total: number; online: number }>> {
  const counts = new Map<string, { total: number; online: number }>();
  const { data } = await admin
    .from("branch_devices")
    .select("room_id, last_seen_at")
    .eq("branch_id", branchId)
    .eq("device_kind", "audio")
    .not("room_id", "is", null);
  for (const row of (data ?? []) as { room_id: string; last_seen_at: string | null }[]) {
    const entry = counts.get(row.room_id) ?? { total: 0, online: 0 };
    entry.total += 1;
    if (isOnline(row.last_seen_at)) entry.online += 1;
    counts.set(row.room_id, entry);
  }
  return counts;
}

function buildAudioZone(
  row: AudioZoneRow,
  roomIds: string[],
  rooms: Room[],
  zones: Zone[],
  playlistNameById: Map<string, string>,
  speakerCounts: Map<string, { total: number; online: number }>,
): AudioZone {
  const roomNames = roomIds
    .map((id) => rooms.find((r) => r.id === id)?.name)
    .filter((n): n is string => !!n);
  const zone = row.zone_id ? zones.find((z) => z.id === row.zone_id) : undefined;

  let speakersTotal = 0;
  let speakersOnline = 0;
  for (const roomId of roomIds) {
    const c = speakerCounts.get(roomId);
    if (c) {
      speakersTotal += c.total;
      speakersOnline += c.online;
    }
  }

  return {
    id: row.id,
    branchId: row.branch_id,
    zoneId: row.zone_id,
    zoneName: zone?.name ?? null,
    name: row.name,
    description: row.description ?? "",
    status: row.status === "inactive" ? "inactive" : "active",
    volume: row.volume,
    volumeLimit: row.volume_limit,
    crossfadeSeconds: row.crossfade_seconds,
    audioDuckingEnabled: row.audio_ducking_enabled,
    announcementsEnabled: row.announcements_enabled,
    defaultPlaylistId: row.default_playlist_id,
    defaultPlaylistName: row.default_playlist_id ? (playlistNameById.get(row.default_playlist_id) ?? null) : null,
    scheduleStart: shortTime(row.schedule_start),
    scheduleEnd: shortTime(row.schedule_end),
    roomIds,
    roomNames,
    speakersTotal,
    speakersOnline,
    createdAt: row.created_at,
  };
}

export async function listAudioZonesForBranch(branchId: string): Promise<AudioZone[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from("audio_zones")
    .select(AUDIO_ZONE_COLUMNS)
    .eq("branch_id", branchId)
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as AudioZoneRow[];
  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const playlistIds = [...new Set(rows.map((r) => r.default_playlist_id).filter((x): x is string => !!x))];

  const [roomIdsByZone, playlistNameById, rooms, zones, speakerCounts] = await Promise.all([
    roomsByAudioZone(admin, ids),
    playlistNames(admin, playlistIds),
    listRooms(branchId),
    listZones(branchId),
    speakerCountsByRoom(admin, branchId),
  ]);

  return rows.map((r) =>
    buildAudioZone(r, roomIdsByZone.get(r.id) ?? [], rooms, zones, playlistNameById, speakerCounts),
  );
}

export async function getAudioZone(branchId: string, id: string): Promise<AudioZone | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from("audio_zones")
    .select(AUDIO_ZONE_COLUMNS)
    .eq("branch_id", branchId)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const row = data as AudioZoneRow;
  const [roomIdsByZone, playlistNameById, rooms, zones, speakerCounts] = await Promise.all([
    roomsByAudioZone(admin, [row.id]),
    row.default_playlist_id ? playlistNames(admin, [row.default_playlist_id]) : Promise.resolve(new Map<string, string>()),
    listRooms(branchId),
    listZones(branchId),
    speakerCountsByRoom(admin, branchId),
  ]);

  return buildAudioZone(row, roomIdsByZone.get(row.id) ?? [], rooms, zones, playlistNameById, speakerCounts);
}
