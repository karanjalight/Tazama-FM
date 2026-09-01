/**
 * Turns an Audio Zone's assigned playlist into "what plays next." No new
 * position-tracking state — the current track's index within the playlist
 * (found by youtubeId) is enough to compute the next one. SERVER ONLY
 * (takes the service-role client so callers that already have one open
 * don't create a second connection per request).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { nextPlaylistPosition } from "@/lib/business/playlist-position";
import type { RoomTrack } from "@/lib/rooms/types";

interface TrackJoinRow {
  youtube_id: string;
  title: string;
  artist: string | null;
  thumbnail_url: string | null;
}

interface PlaylistTrackRow {
  position: number;
  tracks: TrackJoinRow | TrackJoinRow[] | null;
}

function extractTrack(value: PlaylistTrackRow["tracks"]): TrackJoinRow | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function resolveNextPlaylistTrack(
  admin: SupabaseClient,
  playlistId: string,
  currentYoutubeId: string | null,
): Promise<RoomTrack | null> {
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
  if (!track) return null;
  return {
    youtubeId: track.youtube_id,
    title: track.title,
    artist: track.artist,
    thumbnailUrl: track.thumbnail_url,
  };
}
