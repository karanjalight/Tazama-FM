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
import type { AudioZone, AudioZonePlaybackState } from "@/lib/business/audio-zone-types";
import type { RoomTrack } from "@/lib/rooms/types";

interface AudioZoneRow {
  id: string;
  slug: string | null;
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
  synchronized_playback: boolean;
  created_at: string;
}

const AUDIO_ZONE_COLUMNS =
  "id, slug, branch_id, zone_id, name, description, status, volume, volume_limit, crossfade_seconds, audio_ducking_enabled, announcements_enabled, default_playlist_id, schedule_start, schedule_end, synchronized_playback, created_at";

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

/** Batched sibling of `getAudioZonePlayback` — one query for every
 * synchronized zone's playback state instead of N. */
async function playbackStatesByZone(
  admin: SupabaseClient,
  zoneIds: string[],
): Promise<Map<string, AudioZonePlaybackState>> {
  const map = new Map<string, AudioZonePlaybackState>();
  if (!zoneIds.length) return map;
  const { data } = await admin
    .from("audio_zone_playback")
    .select("zone_id, track, position_ms, is_playing, version, updated_at")
    .in("zone_id", zoneIds);
  for (const row of (data ?? []) as {
    zone_id: string;
    track: RoomTrack | null;
    position_ms: number;
    is_playing: boolean;
    version: number;
    updated_at: string;
  }[]) {
    map.set(row.zone_id, {
      track: row.track,
      positionMs: row.position_ms,
      isPlaying: row.is_playing,
      version: row.version,
      updatedAt: row.updated_at,
    });
  }
  return map;
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
  branchName: string,
  roomIds: string[],
  rooms: Room[],
  zones: Zone[],
  playlistNameById: Map<string, string>,
  speakerCounts: Map<string, { total: number; online: number }>,
  playbackByZone: Map<string, AudioZonePlaybackState>,
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
    slug: row.slug,
    branchId: row.branch_id,
    branchName,
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
    synchronizedPlayback: row.synchronized_playback,
    defaultPlaylistId: row.default_playlist_id,
    defaultPlaylistName: row.default_playlist_id ? (playlistNameById.get(row.default_playlist_id) ?? null) : null,
    scheduleStart: shortTime(row.schedule_start),
    scheduleEnd: shortTime(row.schedule_end),
    roomIds,
    roomNames,
    speakersTotal,
    speakersOnline,
    playback: row.synchronized_playback ? (playbackByZone.get(row.id) ?? null) : null,
    createdAt: row.created_at,
  };
}

async function branchNameById(admin: SupabaseClient, branchId: string): Promise<string> {
  const { data } = await admin.from("branches").select("name").eq("id", branchId).maybeSingle();
  return (data as { name: string } | null)?.name ?? "";
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
  const syncedIds = rows.filter((r) => r.synchronized_playback).map((r) => r.id);
  const playlistIds = [...new Set(rows.map((r) => r.default_playlist_id).filter((x): x is string => !!x))];

  const [roomIdsByZone, playlistNameById, rooms, zones, speakerCounts, playbackByZone, branchName] = await Promise.all([
    roomsByAudioZone(admin, ids),
    playlistNames(admin, playlistIds),
    listRooms(branchId),
    listZones(branchId),
    speakerCountsByRoom(admin, branchId),
    playbackStatesByZone(admin, syncedIds),
    branchNameById(admin, branchId),
  ]);

  return rows.map((r) =>
    buildAudioZone(r, branchName, roomIdsByZone.get(r.id) ?? [], rooms, zones, playlistNameById, speakerCounts, playbackByZone),
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
  const [roomIdsByZone, playlistNameById, rooms, zones, speakerCounts, playbackByZone, branchName] = await Promise.all([
    roomsByAudioZone(admin, [row.id]),
    row.default_playlist_id ? playlistNames(admin, [row.default_playlist_id]) : Promise.resolve(new Map<string, string>()),
    listRooms(branchId),
    listZones(branchId),
    speakerCountsByRoom(admin, branchId),
    row.synchronized_playback ? playbackStatesByZone(admin, [row.id]) : Promise.resolve(new Map<string, AudioZonePlaybackState>()),
    branchNameById(admin, branchId),
  ]);

  return buildAudioZone(row, branchName, roomIdsByZone.get(row.id) ?? [], rooms, zones, playlistNameById, speakerCounts, playbackByZone);
}

/**
 * Public, unscoped lookup for the /zones/[slug] consumer page — no branchId
 * to scope by (a joiner only ever has the slug), no viewer check (matches
 * getAudioZonePlayback's existing "unlisted but shareable by link" posture;
 * the raw audio_zones table itself stays staff-only via RLS, but nothing
 * here goes through RLS — this is the service-role client, same as every
 * other business query in this app).
 */
export async function getAudioZoneBySlug(slug: string): Promise<AudioZone | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin.from("audio_zones").select(AUDIO_ZONE_COLUMNS).eq("slug", slug).maybeSingle();
  if (!data) return null;
  const row = data as AudioZoneRow;

  const [roomIdsByZone, playlistNameById, rooms, zones, speakerCounts, playbackByZone, branchName] = await Promise.all([
    roomsByAudioZone(admin, [row.id]),
    row.default_playlist_id ? playlistNames(admin, [row.default_playlist_id]) : Promise.resolve(new Map<string, string>()),
    listRooms(row.branch_id),
    listZones(row.branch_id),
    speakerCountsByRoom(admin, row.branch_id),
    row.synchronized_playback ? playbackStatesByZone(admin, [row.id]) : Promise.resolve(new Map<string, AudioZonePlaybackState>()),
    branchNameById(admin, row.branch_id),
  ]);

  return buildAudioZone(row, branchName, roomIdsByZone.get(row.id) ?? [], rooms, zones, playlistNameById, speakerCounts, playbackByZone);
}

/** The synchronized zone (if any) covering this room — a room isn't
 * expected to be in more than one synchronized zone at once, but this
 * deterministically picks one (arbitrary DB order) rather than erroring
 * if it ever is. */
export async function getSynchronizedZoneForRoom(roomId: string): Promise<{ id: string } | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("audio_zone_rooms")
    .select("audio_zone_id, audio_zones!inner(synchronized_playback)")
    .eq("room_id", roomId)
    .eq("audio_zones.synchronized_playback", true)
    .limit(1);
  const rows = (data ?? []) as { audio_zone_id: string }[];
  return rows[0] ? { id: rows[0].audio_zone_id } : null;
}

export async function getAudioZonePlayback(zoneId: string): Promise<AudioZonePlaybackState | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("audio_zone_playback")
    .select("track, position_ms, is_playing, version, updated_at")
    .eq("zone_id", zoneId)
    .maybeSingle();
  if (!data) return null;
  return {
    track: data.track as RoomTrack | null,
    positionMs: data.position_ms,
    isPlaying: data.is_playing,
    version: data.version,
    updatedAt: data.updated_at,
  };
}
