const VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

/** YouTube's `videos.list` caps `id` at 50 comma-separated ids per call. */
const MAX_IDS_PER_CALL = 50;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

interface YouTubeVideosItem {
  id?: string;
  contentDetails?: { duration?: string };
}

/**
 * Parses an ISO-8601 duration ("PT4M13S", "PT1H2M3S", "PT45S") into whole
 * seconds. Returns null for anything that doesn't match (e.g. a live stream
 * reporting "P0D").
 */
export function parseIsoDurationSeconds(iso: string): number | null {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? total : null;
}

/**
 * Real per-video durations for a batch of YouTube video ids — `search.list`
 * (lib/youtube/search.ts) doesn't return this, so schedule/playlist duration
 * math needs this second call. **SERVER ONLY**. Best-effort: a failed or
 * partial response just means some/all ids are missing from the returned
 * map, never throws (callers already tolerate a missing duration by falling
 * back to "ask staff to enter it").
 */
export async function fetchDurations(youtubeIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const ids = [...new Set(youtubeIds.filter(Boolean))];
  if (!ids.length) return out;

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return out;

  for (const batch of chunk(ids, MAX_IDS_PER_CALL)) {
    const params = new URLSearchParams({
      key: apiKey,
      part: "contentDetails",
      id: batch.join(","),
    });
    try {
      const res = await fetch(`${VIDEOS_URL}?${params.toString()}`);
      if (!res.ok) continue;
      const json = (await res.json()) as { items?: YouTubeVideosItem[] };
      for (const item of json.items ?? []) {
        const iso = item.contentDetails?.duration;
        const id = item.id;
        if (!id || !iso) continue;
        const seconds = parseIsoDurationSeconds(iso);
        if (seconds !== null) out.set(id, seconds);
      }
    } catch {
      // Best-effort — leave this batch's ids out of the result map.
    }
  }
  return out;
}
