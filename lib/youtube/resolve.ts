/**
 * Track resolver — turns a concierge suggestion (title + artist) into a concrete,
 * playable YouTube video, with a read-through Supabase cache. **SERVER ONLY**:
 * reads `YOUTUBE_API_KEY` (via `searchTracks`) and the service-role key (via the
 * admin client), neither of which may reach the browser.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { searchTracks } from "@/lib/youtube/search";

/** A suggestion resolved to a concrete, embeddable YouTube video. */
export interface ResolvedTrack {
  videoId: string;
  title: string;
  channelTitle: string | null;
  thumbnail: string | null;
}

/** What the concierge hands us to resolve. (`why` is carried by the caller.) */
export interface TrackQuery {
  title: string;
  artist: string;
}

const CACHE_TABLE = "track_cache";

/** Normalised cache key for an (artist, title) pair: lowercased "{artist}|{title}". */
function cacheKey(title: string, artist: string): string {
  return `${artist.trim().toLowerCase()}|${title.trim().toLowerCase()}`;
}

/**
 * Resolve a song to a playable YouTube video.
 *
 * Read-through cache: looks up `track_cache` first (keyed by "{artist}|{title}")
 * and only calls the YouTube Data API on a miss — then writes the result back so
 * the next lookup is free. Returns `null` when nothing playable is found (or on
 * any API/parse error), so batch callers can simply drop it. When the
 * service-role key isn't configured the cache is skipped and every call hits the
 * API directly.
 */
export async function resolveTrack(
  title: string,
  artist: string,
): Promise<ResolvedTrack | null> {
  const key = cacheKey(title, artist);
  const admin = createAdminClient();

  // 1. Cache hit → skip the API entirely.
  if (admin) {
    const { data } = await admin
      .from(CACHE_TABLE)
      .select("video_id, title, channel_title, thumbnail")
      .eq("cache_key", key)
      .maybeSingle();
    if (data?.video_id) {
      return {
        videoId: data.video_id as string,
        title: (data.title as string) ?? title,
        channelTitle: (data.channel_title as string | null) ?? null,
        thumbnail: (data.thumbnail as string | null) ?? null,
      };
    }
  }

  // 2. Miss → search YouTube for the single best "official audio" match.
  //    searchTracks() constrains to embeddable music, so the hit is safe to play.
  let hit;
  try {
    const query = [artist, title, "official audio"]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ");
    const results = await searchTracks(query, 1);
    hit = results[0];
  } catch (err) {
    console.error(`resolveTrack failed for "${artist} — ${title}":`, err);
    return null;
  }
  if (!hit) return null;

  const resolved: ResolvedTrack = {
    videoId: hit.youtubeId,
    title: hit.title,
    channelTitle: hit.artist,
    thumbnail: hit.thumbnailUrl,
  };

  // 3. Write through to the cache (best-effort; idempotent on cache_key).
  if (admin) {
    await admin.from(CACHE_TABLE).upsert(
      {
        cache_key: key,
        video_id: resolved.videoId,
        title: resolved.title,
        channel_title: resolved.channelTitle,
        thumbnail: resolved.thumbnail,
      },
      { onConflict: "cache_key" },
    );
  }

  return resolved;
}

/**
 * Resolve many suggestions in parallel, dropping any that don't resolve.
 * Order is preserved for those that do.
 */
export async function resolveMany(
  tracks: TrackQuery[],
): Promise<ResolvedTrack[]> {
  const resolved = await Promise.all(
    tracks.map((t) => resolveTrack(t.title, t.artist)),
  );
  return resolved.filter((t): t is ResolvedTrack => t !== null);
}
