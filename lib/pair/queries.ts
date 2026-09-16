/**
 * Server reads for Pair with a Screen (`/pair/[deviceSlug]`): the device a
 * guest paired with, and everything their phone mirrors — what's playing,
 * schedule signage, the request queue, and what the playlist plays after the
 * requests. SERVER ONLY (service-role client).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { isOnline } from "@/lib/business/queries";
import { genreLabel } from "@/lib/genres";
import { asRoomTrack } from "@/lib/pair/room-track";
import { cursorBasis, upcomingIndices } from "@/lib/pair/playlist-cursor";
import { readPlaylistCursor } from "@/lib/pair/playlist-cursor-store";
import { resolveRoomSource, sourceRoomIds, type RoomSource } from "@/lib/pair/room-source";
import type { ScheduleContentSnapshot } from "@/lib/business/schedule-types";
import type { PairDevice, PairRequest, PairSource, PairState, PairUpcoming } from "@/lib/pair/types";
import type { RoomTrack } from "@/lib/rooms/types";

const UPCOMING_COUNT = 5;
const MAX_LISTED_REQUESTS = 50;

export async function getPairDeviceBySlug(slug: string): Promise<PairDevice | null> {
  const admin = createAdminClient();
  if (!admin || !slug) return null;

  // Errors (e.g. business-pair-requests.sql not applied, so no `slug` column)
  // read as "not found" rather than crashing the page.
  const { data, error } = await admin
    .from("branch_devices")
    .select("id, slug, name, device_kind, room_id, branch_id")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as {
    id: string;
    slug: string;
    name: string;
    device_kind: string;
    room_id: string | null;
    branch_id: string;
  };

  const [{ data: room }, { data: branch }] = await Promise.all([
    row.room_id
      ? admin.from("rooms").select("name").eq("id", row.room_id).maybeSingle()
      : Promise.resolve({ data: null as { name: string } | null }),
    admin.from("branches").select("name").eq("id", row.branch_id).maybeSingle(),
  ]);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    kind: row.device_kind === "audio" ? "audio" : "screen",
    roomId: row.room_id,
    roomName: (room as { name: string } | null)?.name ?? null,
    branchName: (branch as { name: string } | null)?.name ?? null,
  };
}

/** The pairing slug a room's kiosk advertises in its QR badge — the room's
 * primary screen, else its earliest-paired screen, else any device. Every
 * device in a room mirrors the same playback, so any of them pairs a guest
 * into the same experience. Null before the slug migration is applied. */
export async function getPairSlugForRoom(roomId: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from("branch_devices")
    .select("slug, device_kind, is_primary, paired_at")
    .eq("room_id", roomId);
  if (error || !data?.length) return null;
  const rows = (data as { slug: string | null; device_kind: string; is_primary: boolean; paired_at: string }[])
    .filter((d) => !!d.slug)
    .sort(
      (a, b) =>
        Number(b.device_kind === "screen") - Number(a.device_kind === "screen") ||
        Number(b.is_primary) - Number(a.is_primary) ||
        a.paired_at.localeCompare(b.paired_at),
    );
  return rows[0]?.slug ?? null;
}

export interface SourcePlayback {
  track: RoomTrack | null;
  positionMs: number;
  isPlaying: boolean;
  /** Same `at` the realtime hooks derive, so a poll and a realtime event for
   * the same row agree on position. */
  at: number;
  content: ScheduleContentSnapshot | null;
}

const EMPTY_PLAYBACK: SourcePlayback = { track: null, positionMs: 0, isPlaying: false, at: 0, content: null };

export async function readSourcePlayback(admin: SupabaseClient, source: PairSource): Promise<SourcePlayback> {
  if (source.kind === "schedule") {
    const { data } = await admin
      .from("schedule_playback")
      .select("track, content, position_ms, is_playing, started_at, updated_at")
      .eq("schedule_id", source.id)
      .maybeSingle();
    if (!data) return EMPTY_PLAYBACK;
    return {
      track: asRoomTrack(data.track),
      positionMs: data.position_ms ?? 0,
      isPlaying: data.is_playing ?? false,
      // When the *track* last changed — updated_at also moves on content-only
      // writes (see useSchedulePlayback).
      at: new Date(data.started_at ?? data.updated_at).getTime(),
      content: (data.content as ScheduleContentSnapshot | null) ?? null,
    };
  }

  const { data } =
    source.kind === "zone"
      ? await admin
          .from("audio_zone_playback")
          .select("track, position_ms, is_playing, updated_at")
          .eq("zone_id", source.id)
          .maybeSingle()
      : await admin
          .from("room_playback")
          .select("track, position_ms, is_playing, updated_at")
          .eq("room_id", source.id)
          .maybeSingle();
  if (!data) return EMPTY_PLAYBACK;
  return {
    track: asRoomTrack(data.track),
    positionMs: data.position_ms ?? 0,
    isPlaying: data.is_playing ?? false,
    at: new Date(data.updated_at).getTime(),
    content: null,
  };
}

async function listQueuedRequests(admin: SupabaseClient, roomIds: string[], viewerId: string | null): Promise<PairRequest[]> {
  if (!roomIds.length) return [];
  const { data, error } = await admin
    .from("venue_requests")
    .select("id, track, added_by, added_by_name, created_at")
    .in("room_id", roomIds)
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(MAX_LISTED_REQUESTS);
  if (error || !data?.length) return [];
  const rows = data as { id: string; track: unknown; added_by: string; added_by_name: string | null; created_at: string }[];

  const { data: likes } = await admin
    .from("venue_request_likes")
    .select("request_id, actor_id")
    .in(
      "request_id",
      rows.map((r) => r.id),
    );
  const likeCount = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const like of (likes ?? []) as { request_id: string; actor_id: string }[]) {
    likeCount.set(like.request_id, (likeCount.get(like.request_id) ?? 0) + 1);
    if (viewerId && like.actor_id === viewerId) likedByMe.add(like.request_id);
  }

  const requests: PairRequest[] = [];
  for (const row of rows) {
    const track = asRoomTrack(row.track);
    if (!track) continue;
    requests.push({
      id: row.id,
      track,
      // Never expose `added_by` itself — a guest id is their only removal
      // credential (same reasoning as getRoomQueue).
      addedByName: row.added_by_name,
      mine: !!viewerId && row.added_by === viewerId,
      likeCount: likeCount.get(row.id) ?? 0,
      likedByMe: likedByMe.has(row.id),
      createdAt: row.created_at,
    });
  }
  return requests;
}

async function roomHasOnlineDevice(admin: SupabaseClient, roomId: string): Promise<boolean> {
  const { data } = await admin.from("branch_devices").select("last_seen_at").eq("room_id", roomId);
  return ((data ?? []) as { last_seen_at: string | null }[]).some((d) => isOnline(d.last_seen_at));
}

/** Catalog lookup only — never calls YouTube from a polled read (quota). */
async function trackDurationMs(admin: SupabaseClient, youtubeId: string | null): Promise<number | null> {
  if (!youtubeId) return null;
  const { data } = await admin.from("tracks").select("duration_seconds").eq("youtube_id", youtubeId).limit(1).maybeSingle();
  const seconds = (data as { duration_seconds: number | null } | null)?.duration_seconds ?? null;
  return seconds && seconds > 0 ? seconds * 1000 : null;
}

function mixOf(genres: string[]): PairUpcoming {
  const labels = genres.slice(0, 3).map(genreLabel);
  return labels.length ? { kind: "mix", label: `A mix of ${labels.join(", ")}` } : { kind: "none" };
}

function tracksAfter(tracks: RoomTrack[], basisYoutubeId: string | null): PairUpcoming {
  if (!tracks.length) return { kind: "none" };
  const basisIndex = basisYoutubeId ? tracks.findIndex((t) => t.youtubeId === basisYoutubeId) : -1;
  return { kind: "tracks", tracks: upcomingIndices(tracks.length, basisIndex, UPCOMING_COUNT).map((i) => tracks[i]) };
}

type TrackJoinRow = { youtube_id: string; title: string; artist: string | null; thumbnail_url: string | null };

async function playlistUpcoming(admin: SupabaseClient, playlistId: string, basisYoutubeId: string | null): Promise<PairUpcoming> {
  const { data: settings, error: settingsError } = await admin
    .from("business_playlists")
    .select("name, playback_mode")
    .eq("id", playlistId)
    .maybeSingle();
  // A continuous playlist blends fresh genre/AI picks least-recently-played
  // first — there's no fixed order to preview (see playlist-resolver.ts).
  if (!settingsError && settings?.playback_mode === "continuous") {
    return { kind: "mix", label: `The ${settings.name} mix` };
  }

  const { data } = await admin
    .from("business_playlist_tracks")
    .select("position, tracks(youtube_id, title, artist, thumbnail_url)")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: true });
  const tracks = ((data ?? []) as { tracks: TrackJoinRow | TrackJoinRow[] | null }[])
    .map((row) => (Array.isArray(row.tracks) ? row.tracks[0] : row.tracks))
    .filter((t): t is TrackJoinRow => !!t)
    .map((t) => ({ youtubeId: t.youtube_id, title: t.title, artist: t.artist, thumbnailUrl: t.thumbnail_url }));
  return tracksAfter(tracks, basisYoutubeId);
}

/** Mirrors each advance path's own resolution order after requests. */
async function previewUpcoming(
  admin: SupabaseClient,
  source: RoomSource,
  roomId: string,
  basisYoutubeId: string | null,
): Promise<PairUpcoming> {
  if (source.kind === "schedule") {
    const { session } = source;
    if (!session.playlistEnabled) return { kind: "none" };
    if (!session.songs.length) return mixOf(session.genres);
    const ordered = [...session.songs]
      .sort((a, b) => a.position - b.position)
      .map((s) => ({ youtubeId: s.track.youtubeId, title: s.track.title, artist: s.track.artist, thumbnailUrl: s.track.thumbnailUrl }));
    return tracksAfter(ordered, basisYoutubeId);
  }

  if (source.kind === "zone") {
    const { data: zone } = await admin.from("audio_zones").select("default_playlist_id").eq("id", source.id).maybeSingle();
    if (zone?.default_playlist_id) return playlistUpcoming(admin, zone.default_playlist_id, basisYoutubeId);
    const { data: room } = await admin.from("rooms").select("genres").eq("id", roomId).maybeSingle();
    return mixOf((room?.genres as string[] | null) ?? []);
  }

  // Room source: queued room_queue songs play before the zone playlist.
  const { data: queued } = await admin
    .from("room_queue")
    .select("track")
    .eq("room_id", roomId)
    .eq("played", false)
    .order("created_at", { ascending: true })
    .limit(UPCOMING_COUNT);
  const queuedTracks = ((queued ?? []) as { track: unknown }[])
    .map((row) => asRoomTrack(row.track))
    .filter((t): t is RoomTrack => !!t);
  if (queuedTracks.length) return { kind: "tracks", tracks: queuedTracks };

  const { data: zoneLinks } = await admin
    .from("audio_zone_rooms")
    .select("audio_zones(default_playlist_id)")
    .eq("room_id", roomId);
  const playlistId =
    ((zoneLinks ?? []) as {
      audio_zones: { default_playlist_id: string | null } | { default_playlist_id: string | null }[] | null;
    }[])
      .map((r) => (Array.isArray(r.audio_zones) ? r.audio_zones[0] : r.audio_zones))
      .find((z) => z?.default_playlist_id)?.default_playlist_id ?? null;
  if (playlistId) return playlistUpcoming(admin, playlistId, basisYoutubeId);

  const { data: room } = await admin.from("rooms").select("genres").eq("id", roomId).maybeSingle();
  return mixOf((room?.genres as string[] | null) ?? []);
}

export async function getPairState(roomId: string, viewerId: string | null): Promise<PairState> {
  const admin = createAdminClient();
  if (!admin) {
    return {
      source: { kind: "room", id: roomId },
      nowPlaying: { ...EMPTY_PLAYBACK, durationMs: null, requestedByName: null },
      content: null,
      requests: [],
      upcoming: { kind: "none" },
      screenOnline: false,
    };
  }

  const source = await resolveRoomSource(roomId);
  const roomIds = await sourceRoomIds(admin, source);
  const [playback, cursor, requests, screenOnline] = await Promise.all([
    readSourcePlayback(admin, source),
    readPlaylistCursor(admin, source.kind, source.id),
    listQueuedRequests(admin, roomIds, viewerId),
    roomHasOnlineDevice(admin, roomId),
  ]);
  const currentYoutubeId = playback.track?.youtubeId ?? null;
  const [upcoming, durationMs] = await Promise.all([
    previewUpcoming(admin, source, roomId, cursorBasis(cursor, currentYoutubeId)),
    trackDurationMs(admin, currentYoutubeId),
  ]);

  return {
    source: { kind: source.kind, id: source.id },
    nowPlaying: {
      track: playback.track,
      positionMs: playback.positionMs,
      isPlaying: playback.isPlaying,
      at: playback.at,
      durationMs,
      requestedByName: playback.track?.requestedByName ?? null,
    },
    content: playback.content,
    requests,
    upcoming,
    screenOnline,
  };
}
