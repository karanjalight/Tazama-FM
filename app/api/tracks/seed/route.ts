import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchGenreTracks, type YouTubeTrack } from "@/lib/youtube/search";
import { getCachedTracksByGenre, TRACKS_PER_GENRE } from "@/lib/tracks";
import { resolveGenre, genreCacheKey } from "@/lib/genres";
import { DEMO_AUTH, DEMO_COOKIE, parseDemoCookie } from "@/lib/demo/demo-session";

/**
 * Read-through cache for the genre dashboard.
 *
 *   POST { genre }  →  { tracks: Track[] }
 *
 * 1. Verify the caller is signed in (real Supabase session, or a demo session).
 * 2. Return cached playable tracks for the genre if we already have enough.
 * 3. Otherwise search YouTube SERVER-SIDE (the key never leaves the server),
 *    persist the results to `tracks`, and return the freshly-filled set.
 *
 * The YouTube key and the service-role key are touched only here.
 */
export async function POST(request: Request) {
  let genre: unknown;
  try {
    ({ genre } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof genre !== "string" || !resolveGenre(genre)) {
    return NextResponse.json({ error: "Unknown genre." }, { status: 400 });
  }
  // Canonical bucket — aliases collapse so legacy/curated slugs share one cache.
  const cacheKey = genreCacheKey(genre);

  // ── Auth: a real Supabase session, or a demo session ──────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let authed = !!user;
  if (!authed && DEMO_AUTH) {
    const store = await cookies();
    authed = !!parseDemoCookie(store.get(DEMO_COOKIE)?.value);
  }
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 1. Serve straight from cache when it's already warm ───────────────────
  const cached = await getCachedTracksByGenre(cacheKey, TRACKS_PER_GENRE);
  if (cached.length >= TRACKS_PER_GENRE) {
    return NextResponse.json({ tracks: cached, cached: true });
  }

  // ── 2. Seed: writing the shared catalog needs the service-role key ────────
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      {
        tracks: cached,
        seeded: false,
        error: "SUPABASE_SERVICE_ROLE_KEY is not configured.",
      },
      { status: cached.length ? 200 : 503 },
    );
  }

  let found: YouTubeTrack[] = [];
  try {
    found = await searchGenreTracks(genre, TRACKS_PER_GENRE);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "YouTube search failed.";
    // Degrade gracefully: hand back whatever cache we have, surface the reason.
    return NextResponse.json(
      { tracks: cached, seeded: false, error: message },
      { status: cached.length ? 200 : 502 },
    );
  }

  if (found.length) {
    const rows = found.map((t) => ({
      youtube_id: t.youtubeId,
      title: t.title,
      artist: t.artist,
      genre: cacheKey,
      thumbnail_url: t.thumbnailUrl,
      is_playable: true,
    }));
    // Idempotent: skip videos we already have.
    const { error } = await admin
      .from("tracks")
      .upsert(rows, { onConflict: "youtube_id", ignoreDuplicates: true });
    if (error) {
      return NextResponse.json(
        { tracks: cached, seeded: false, error: error.message },
        { status: cached.length ? 200 : 500 },
      );
    }
  }

  // Re-read so the response reflects the merged, ordered catalog.
  const fresh = await getCachedTracksByGenre(cacheKey, TRACKS_PER_GENRE);
  return NextResponse.json({ tracks: fresh, seeded: true });
}
