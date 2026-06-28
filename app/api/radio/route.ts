import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/profile";
import { getCachedTracksByGenre, type Track } from "@/lib/tracks";
import { DEFAULT_GENRES } from "@/lib/genres";

/**
 * Endless-radio source for the dashboard player.
 *
 *   POST { exclude?: string[] } → { tracks: Track[] }
 *
 * Returns a fresh, shuffled mix drawn from the viewer's saved genres (cached
 * catalog only — no YouTube call), minus anything already queued. The player
 * tops up its queue from here so playback never stops.
 */
export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let exclude: string[] = [];
  try {
    const body = (await request.json()) as { exclude?: unknown };
    if (Array.isArray(body?.exclude)) {
      exclude = body.exclude.filter((x): x is string => typeof x === "string");
    }
  } catch {
    /* body is optional */
  }

  const genres = profile.genrePreferences.length
    ? profile.genrePreferences
    : DEFAULT_GENRES;

  const buckets = await Promise.all(
    genres.map((g) => getCachedTracksByGenre(g, 12)),
  );

  // Round-robin across genres so the mix stays varied, then light-shuffle so
  // each call differs.
  const excludeSet = new Set(exclude);
  const seen = new Set<string>();
  const mixed: Track[] = [];
  const longest = Math.max(0, ...buckets.map((b) => b.length));
  for (let i = 0; i < longest; i++) {
    for (const b of buckets) {
      const t = b[i];
      if (t && !excludeSet.has(t.youtubeId) && !seen.has(t.youtubeId)) {
        seen.add(t.youtubeId);
        mixed.push(t);
      }
    }
  }
  for (let i = mixed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mixed[i], mixed[j]] = [mixed[j], mixed[i]];
  }

  return NextResponse.json({ tracks: mixed.slice(0, 20) });
}
