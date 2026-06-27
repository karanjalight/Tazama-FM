import { createAdminClient } from "@/lib/supabase/admin";

/** A playable track from the shared catalog (metadata only — YouTube is the CDN). */
export interface Track {
  id: string;
  youtubeId: string;
  title: string;
  artist: string | null;
  genre: string;
  thumbnailUrl: string | null;
  isPlayable: boolean;
}

/** How many tracks we want cached per genre before we stop seeding. */
export const TRACKS_PER_GENRE = 12;

interface TrackRow {
  id: string;
  youtube_id: string;
  title: string;
  artist: string | null;
  genre: string;
  thumbnail_url: string | null;
  is_playable: boolean;
}

export function rowToTrack(r: TrackRow): Track {
  return {
    id: r.id,
    youtubeId: r.youtube_id,
    title: r.title,
    artist: r.artist,
    genre: r.genre,
    thumbnailUrl: r.thumbnail_url,
    isPlayable: r.is_playable,
  };
}

/**
 * Read cached, **playable** tracks for one genre (newest first). SERVER ONLY.
 *
 * Uses the service-role client because the catalog is shared and non-sensitive,
 * and this also has to work during server render before the viewer's auth is in
 * play. Returns `[]` when the catalog can't be reached (e.g. the service-role
 * key isn't configured yet), so the dashboard degrades gracefully.
 */
export async function getCachedTracksByGenre(
  genre: string,
  limit = TRACKS_PER_GENRE,
): Promise<Track[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("tracks")
    .select("*")
    .eq("genre", genre)
    .eq("is_playable", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as TrackRow[]).map(rowToTrack);
}
