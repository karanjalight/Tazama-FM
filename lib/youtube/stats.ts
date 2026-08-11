const VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

interface YouTubeVideoItem {
  statistics?: { viewCount?: string };
}

/**
 * Fetch a single video's view count from YouTube. **SERVER ONLY** — reads
 * `YOUTUBE_API_KEY`, which must never reach the browser. Returns null on a
 * missing key, a missing video, or any request failure — this is a
 * decorative stat, so callers should degrade to hiding it, not erroring.
 */
export async function fetchVideoViewCount(youtubeId: string): Promise<number | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || !youtubeId) return null;

  const params = new URLSearchParams({
    key: apiKey,
    part: "statistics",
    id: youtubeId,
  });

  try {
    const res = await fetch(`${VIDEOS_URL}?${params.toString()}`);
    if (!res.ok) return null;

    const json = (await res.json()) as { items?: YouTubeVideoItem[] };
    const raw = json.items?.[0]?.statistics?.viewCount;
    if (!raw) return null;

    const count = Number(raw);
    return Number.isFinite(count) ? count : null;
  } catch {
    return null;
  }
}
