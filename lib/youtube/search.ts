import { genreQuery } from "@/lib/genres";

/** A raw search hit mapped to the fields we persist. */
export interface YouTubeTrack {
  youtubeId: string;
  title: string;
  artist: string | null;
  thumbnailUrl: string | null;
}

const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

interface YouTubeSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: Record<string, { url?: string } | undefined>;
  };
}

/** YouTube returns HTML-escaped titles ("Burna Boy &amp; ..."). Undo the common ones. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function pickThumbnail(snippet: YouTubeSearchItem["snippet"]): string | null {
  const t = snippet?.thumbnails;
  return t?.high?.url ?? t?.medium?.url ?? t?.default?.url ?? null;
}

/**
 * Search YouTube for embeddable music videos in a genre. **SERVER ONLY** — reads
 * `YOUTUBE_API_KEY`, which must never reach the browser.
 *
 * Constrained to `videoEmbeddable=true`, so every result is safe to mark
 * `is_playable`. Throws on a missing key or a non-OK response so the caller can
 * surface a clear error.
 */
export async function searchGenreTracks(
  genreValue: string,
  max: number,
): Promise<YouTubeTrack[]> {
  // Resolve the query for ANY catalog slug (curated, native, or room tag) and
  // bias toward the genre's most-watched videos ("most featured/viewed" first).
  return searchTracks(genreQuery(genreValue), max, { order: "viewCount" });
}

export interface SearchOptions {
  /** YouTube result ordering. Default "relevance"; "viewCount" for popularity. */
  order?: "relevance" | "viewCount" | "date";
}

/**
 * Free-text YouTube music search (rooms: host/listener "add a track", and the
 * taste-aware suggestion engine). **SERVER ONLY**. Same embeddable constraints
 * as the genre seed so every hit is safe to play in a room.
 */
export async function searchTracks(
  query: string,
  max: number,
  opts: SearchOptions = {},
): Promise<YouTubeTrack[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY is not configured.");

  const params = new URLSearchParams({
    key: apiKey,
    part: "snippet",
    q: query,
    type: "video",
    order: opts.order ?? "relevance",
    videoEmbeddable: "true",
    videoSyndicated: "true",
    videoCategoryId: "10", // Music
    safeSearch: "moderate",
    maxResults: String(Math.min(Math.max(max, 1), 50)),
  });

  const res = await fetch(`${SEARCH_URL}?${params.toString()}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `YouTube search failed (${res.status}): ${body.slice(0, 300)}`,
    );
  }

  const json = (await res.json()) as { items?: YouTubeSearchItem[] };
  const items = json.items ?? [];

  const out: YouTubeTrack[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const id = item.id?.videoId;
    const rawTitle = item.snippet?.title;
    if (!id || !rawTitle || seen.has(id)) continue;
    seen.add(id);
    out.push({
      youtubeId: id,
      title: decodeEntities(rawTitle),
      artist: item.snippet?.channelTitle
        ? decodeEntities(item.snippet.channelTitle)
        : null,
      thumbnailUrl: pickThumbnail(item.snippet),
    });
  }
  return out;
}
