/**
 * Turns an Audio Zone's assigned playlist into "what plays next." SERVER ONLY
 * (takes the service-role client so callers that already have one open
 * don't create a second connection per request).
 *
 * - `repeat` playlists (the default): no position-tracking state — the
 *   current track's index within the playlist (found by youtubeId) is enough
 *   to compute the next one, wrapping at the end.
 * - `continuous` playlists: saved songs blended with the mix pool's fresh
 *   genre/AI songs, least-recently-played first (lib/business/playlist-mix.ts).
 *   Falls back to the repeat path whenever nothing is resolvable, so a pool
 *   or migration problem never silences a zone. Callers must report a
 *   landed play via `schedulePlaylistPlayRecord`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { nextPlaylistPosition } from "@/lib/business/playlist-position";
import { mixRefillNeeds, resolveMixPick, type MixItem, type MixSource } from "@/lib/business/playlist-mix";
import { scheduleMixRefill } from "@/lib/business/playlist-mix-pool";
import type { RoomTrack } from "@/lib/rooms/types";

interface TrackJoinRow {
  youtube_id: string;
  title: string;
  artist: string | null;
  thumbnail_url: string | null;
}

type TrackJoin = TrackJoinRow | TrackJoinRow[] | null;

interface PlaylistTrackRow {
  position: number;
  tracks: TrackJoin;
}

function extractTrack(value: TrackJoin): TrackJoinRow | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toRoomTrack(track: TrackJoinRow): RoomTrack {
  return {
    youtubeId: track.youtube_id,
    title: track.title,
    artist: track.artist,
    thumbnailUrl: track.thumbnail_url,
  };
}

type MixCandidate = MixItem & { track: TrackJoinRow };

async function resolveContinuousTrack(
  admin: SupabaseClient,
  playlistId: string,
  settings: {
    genres: string[] | null;
    mix_genre_refreshed_at: string | null;
    mix_ai_refreshed_at: string | null;
  },
  currentYoutubeId: string | null,
): Promise<RoomTrack | null> {
  const [{ data: savedData, error: savedError }, { data: poolData, error: poolError }] = await Promise.all([
    admin
      .from("business_playlist_tracks")
      .select("position, last_played_at, tracks(youtube_id, title, artist, thumbnail_url)")
      .eq("playlist_id", playlistId)
      .order("position", { ascending: true }),
    admin
      .from("business_playlist_mix")
      .select("source, last_played_at, tracks(youtube_id, title, artist, thumbnail_url)")
      .eq("playlist_id", playlistId)
      .order("added_at", { ascending: true }),
  ]);
  if (savedError || poolError) return null;

  const bySource: Record<MixSource, MixCandidate[]> = { saved: [], genre: [], ai: [] };
  ((savedData ?? []) as { last_played_at: string | null; tracks: TrackJoin }[]).forEach((row, i) => {
    const track = extractTrack(row.tracks);
    if (track) bySource.saved.push({ youtubeId: track.youtube_id, lastPlayedAt: row.last_played_at, order: i, track });
  });
  const pool = (poolData ?? []) as { source: "genre" | "ai"; last_played_at: string | null; tracks: TrackJoin }[];
  pool.forEach((row, i) => {
    const track = extractTrack(row.tracks);
    if (track) bySource[row.source].push({ youtubeId: track.youtube_id, lastPlayedAt: row.last_played_at, order: i, track });
  });

  const needs = mixRefillNeeds({
    genresCount: settings.genres?.length ?? 0,
    savedCount: bySource.saved.length,
    pool: pool.map((p) => ({ source: p.source, lastPlayedAt: p.last_played_at })),
    genreRefreshedAt: settings.mix_genre_refreshed_at,
    aiRefreshedAt: settings.mix_ai_refreshed_at,
    now: Date.now(),
  });
  if (needs.genre || needs.ai) scheduleMixRefill(admin, playlistId);

  const pick = resolveMixPick({ currentYoutubeId, bySource, roll: Math.random() });
  return pick ? toRoomTrack(pick.item.track) : null;
}

export async function resolveNextPlaylistTrack(
  admin: SupabaseClient,
  playlistId: string,
  currentYoutubeId: string | null,
): Promise<RoomTrack | null> {
  // Errors (e.g. business-playlist-ai.sql not applied yet) read as repeat mode.
  const { data: settings, error: settingsError } = await admin
    .from("business_playlists")
    .select("playback_mode, genres, mix_genre_refreshed_at, mix_ai_refreshed_at")
    .eq("id", playlistId)
    .maybeSingle();
  if (!settingsError && settings?.playback_mode === "continuous") {
    const next = await resolveContinuousTrack(admin, playlistId, settings, currentYoutubeId);
    if (next) return next;
  }

  const { data } = await admin
    .from("business_playlist_tracks")
    .select("position, tracks(youtube_id, title, artist, thumbnail_url)")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: true });
  const rows = (data ?? []) as PlaylistTrackRow[];
  if (!rows.length) return null;

  // Index within THIS ordered result, not the raw `position` column value
  // (which may have gaps) — nextPlaylistPosition works on trackCount/index.
  const currentIndex = currentYoutubeId
    ? rows.findIndex((r) => extractTrack(r.tracks)?.youtube_id === currentYoutubeId)
    : -1;
  const nextIndex = nextPlaylistPosition(rows.length, currentIndex === -1 ? null : currentIndex);

  const track = extractTrack(rows[nextIndex]?.tracks ?? null);
  return track ? toRoomTrack(track) : null;
}
