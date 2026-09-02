import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { genreCacheKey } from "@/lib/genres";
import { searchGenreTracks, type YouTubeTrack } from "@/lib/youtube/search";
import { fetchDurations } from "@/lib/youtube/durations";

/** A playable track from the shared catalog (metadata only — YouTube is the CDN). */
export interface Track {
  id: string;
  youtubeId: string;
  title: string;
  artist: string | null;
  genre: string;
  thumbnailUrl: string | null;
  isPlayable: boolean;
  /** Real seconds, from YouTube's `videos.list.contentDetails` — null for a
   * track cataloged before this column existed, until something re-touches it. */
  durationSeconds: number | null;
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
  duration_seconds: number | null;
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
    durationSeconds: r.duration_seconds,
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
 * Read-through seed for ONE genre. Guarantees the genre's canonical cache bucket
 * holds at least `min` playable tracks (seeded most-viewed-first), then returns
 * them. Used by the room suggestion engine and the dashboard seed route so ANY
 * picked genre — curated, native, or room tag — self-warms on first use.
 *
 * SERVER ONLY. Best-effort: degrades to whatever cache exists if the service
 * role key or YouTube key is missing, or a search fails.
 */
export async function ensureGenreSeeded(
  value: string,
  min = TRACKS_PER_GENRE,
): Promise<Track[]> {
  const key = genreCacheKey(value);
  const want = Math.max(min, TRACKS_PER_GENRE);

  const cached = await getCachedTracksByGenre(key, want);
  if (cached.length >= min) return cached;

  const admin = createAdminClient();
  if (!admin) return cached;

  let found;
  try {
    found = await searchGenreTracks(value, want);
  } catch {
    return cached;
  }

  if (found.length) {
    const durations = await fetchDurations(found.map((t) => t.youtubeId));
    const rows = found.map((t) => ({
      youtube_id: t.youtubeId,
      title: t.title,
      artist: t.artist,
      genre: key,
      thumbnail_url: t.thumbnailUrl,
      is_playable: true,
      duration_seconds: durations.get(t.youtubeId) ?? null,
    }));
    // Idempotent; youtube_id is globally unique so a video keeps its first genre.
    await admin
      .from("tracks")
      .upsert(rows, { onConflict: "youtube_id", ignoreDuplicates: true });
  }

  return getCachedTracksByGenre(key, want);
}

/**
 * Upsert a specific, hand-picked set of YouTube results into the shared
 * catalog and return every one of them as a `Track` (freshly inserted or
 * already-cataloged), in the same order as `picks`. For callers — like a
 * business playlist's "add tracks" flow — that need the tracks' real `id`s
 * back to link them elsewhere, unlike `ensureGenreSeeded` above, which only
 * needs the catalog warm and can afford to lose already-existing rows from
 * its `.select()` result.
 *
 * Deliberately NOT a single `.upsert(..., { ignoreDuplicates: false })` call
 * (the pattern `app/api/tracks/seed/route.ts` uses with `true`): that would
 * update ALL provided columns on every conflicting row, silently overwriting
 * `genre` on a track that's already cataloged under a real dashboard genre
 * with the generic "business" bucket below. Instead this only ever INSERTs
 * rows that don't already exist (by `youtube_id`), then re-selects the full
 * set — an existing track's `genre` (and everything else about it) is never
 * touched.
 *
 * SERVER ONLY. Takes an already-resolved `admin` client (the caller has
 * already done its own `createAdminClient()` null-check).
 */
export async function upsertTracksFromYouTube(
  admin: SupabaseClient,
  picks: YouTubeTrack[],
): Promise<Track[]> {
  if (!picks.length) return [];

  const youtubeIds = picks.map((p) => p.youtubeId);
  const { data: existingRows } = await admin
    .from("tracks")
    .select("*")
    .in("youtube_id", youtubeIds);
  const existingIds = new Set(
    ((existingRows ?? []) as TrackRow[]).map((r) => r.youtube_id),
  );

  const toInsert = picks.filter((p) => !existingIds.has(p.youtubeId));
  if (toInsert.length) {
    const durations = await fetchDurations(toInsert.map((t) => t.youtubeId));
    const rows = toInsert.map((t) => ({
      youtube_id: t.youtubeId,
      title: t.title,
      artist: t.artist,
      // Business-picked tracks aren't tied to one dashboard genre bucket —
      // "business" is a free-text catalog label (tracks.genre has no check
      // constraint), only ever set on a brand-new row.
      genre: "business",
      thumbnail_url: t.thumbnailUrl,
      is_playable: true,
      duration_seconds: durations.get(t.youtubeId) ?? null,
    }));
    // `ignoreDuplicates: true` is safe here — `toInsert` was already
    // filtered to youtube_ids we just confirmed don't exist, so a conflict
    // here only means a concurrent insert raced us. We want to KEEP the
    // winner's row untouched (re-selected below), not clobber it.
    const { error } = await admin
      .from("tracks")
      .upsert(rows, { onConflict: "youtube_id", ignoreDuplicates: true });
    if (error) console.error("upsertTracksFromYouTube: insert failed", error);
  }

  const { data: finalRows } = await admin
    .from("tracks")
    .select("*")
    .in("youtube_id", youtubeIds);
  const byYoutubeId = new Map(
    ((finalRows ?? []) as TrackRow[]).map((r) => [r.youtube_id, rowToTrack(r)]),
  );

  // Preserve the caller's pick order; drop any pick that still didn't come
  // back (e.g. the insert failed above).
  return picks
    .map((p) => byYoutubeId.get(p.youtubeId))
    .filter((t): t is Track => !!t);
}

/**
 * Every playable track (newest first), for in-memory grouping by the discovery
 * feed. One query, then we slice/group/shuffle on the server. SERVER ONLY.
 */
export async function getAllPlayableTracks(limit = 500): Promise<Track[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("tracks")
    .select("*")
    .eq("is_playable", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!data) return [];
  return (data as TrackRow[]).map(rowToTrack);
}

/**
 * Exact number of playable tracks in the catalog — the real "tracks in rotation"
 * figure. Uses a head count so it's not capped by a fetch limit. SERVER ONLY.
 */
export async function countPlayableTracks(): Promise<number> {
  const admin = createAdminClient();
  if (!admin) return 0;
  const { count } = await admin
    .from("tracks")
    .select("id", { count: "exact", head: true })
    .eq("is_playable", true);
  return count ?? 0;
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

/**
 * Real durations (in seconds) for a set of `tracks.id`s, keyed by track id —
 * what the Schedules playlist-duration math needs. Read-through cache: any
 * row whose `duration_seconds` is still null (cataloged before this column
 * existed) gets resolved from YouTube and patched in place before returning,
 * same shape as `ensureGenreSeeded`'s self-healing. A track that still can't
 * be resolved (e.g. the video was deleted) is simply absent from the map —
 * callers treat a missing id as "unknown," not zero.
 *
 * SERVER ONLY. Takes an already-resolved `admin` client.
 */
export async function getTrackDurations(
  admin: SupabaseClient,
  trackIds: string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const ids = [...new Set(trackIds.filter(Boolean))];
  if (!ids.length) return out;

  const { data } = await admin
    .from("tracks")
    .select("id, youtube_id, duration_seconds")
    .in("id", ids);
  const rows = (data ?? []) as { id: string; youtube_id: string; duration_seconds: number | null }[];

  const missing = rows.filter((r) => r.duration_seconds === null);
  for (const r of rows) {
    if (r.duration_seconds !== null) out.set(r.id, r.duration_seconds);
  }
  if (!missing.length) return out;

  const resolved = await fetchDurations(missing.map((r) => r.youtube_id));
  if (!resolved.size) return out;

  const patches: { id: string; youtube_id: string; duration_seconds: number }[] = [];
  for (const r of missing) {
    const seconds = resolved.get(r.youtube_id);
    if (seconds === undefined) continue;
    out.set(r.id, seconds);
    patches.push({ id: r.id, youtube_id: r.youtube_id, duration_seconds: seconds });
  }
  if (patches.length) {
    await Promise.all(
      patches.map((p) =>
        admin.from("tracks").update({ duration_seconds: p.duration_seconds }).eq("id", p.id),
      ),
    );
  }

  return out;
}
