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

/**
 * A varied "trending" mix for the landing page — newest playable tracks,
 * round-robined across genres so one genre doesn't dominate the row. SERVER ONLY.
 */
export async function getTrendingTracks(limit = 18): Promise<Track[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from("tracks")
    .select("*")
    .eq("is_playable", true)
    .order("created_at", { ascending: false })
    .limit(150);
  if (!data) return [];

  const rows = (data as TrackRow[]).map(rowToTrack);
  const byGenre = new Map<string, Track[]>();
  for (const t of rows) {
    const arr = byGenre.get(t.genre) ?? [];
    arr.push(t);
    byGenre.set(t.genre, arr);
  }
  const buckets = [...byGenre.values()];
  const out: Track[] = [];
  const longest = Math.max(0, ...buckets.map((b) => b.length));
  for (let i = 0; i < longest && out.length < limit; i++) {
    for (const b of buckets) {
      if (b[i]) {
        out.push(b[i]);
        if (out.length >= limit) break;
      }
    }
  }
  return out;
}

/** An artist trending on Tazama: their name, catalog presence, and a track. */
export interface TrendingArtist {
  name: string;
  trackCount: number;
  /** A representative (newest) track — drives the cover + the play action. */
  track: Track;
}

/**
 * Top artists in the catalog, ranked by how many tracks they have (then newest).
 * The `artist` field is the source channel/artist on YouTube. SERVER ONLY.
 */
export async function getTrendingArtists(limit = 10): Promise<TrendingArtist[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from("tracks")
    .select("*")
    .eq("is_playable", true)
    .order("created_at", { ascending: false })
    .limit(400);
  if (!data) return [];

  const rows = (data as TrackRow[]).map(rowToTrack);
  const map = new Map<string, { count: number; track: Track }>();
  for (const t of rows) {
    const name = (t.artist ?? "").trim();
    if (!name) continue;
    const entry = map.get(name);
    if (entry) entry.count += 1;
    else map.set(name, { count: 1, track: t }); // first seen = newest (desc order)
  }

  return [...map.entries()]
    .map(([name, v]) => ({ name, trackCount: v.count, track: v.track }))
    .sort((a, b) => b.trackCount - a.trackCount || a.name.localeCompare(b.name))
    .slice(0, limit);
}
