import { NextResponse } from "next/server";

import { getRoomViewer } from "@/lib/rooms/viewer";
import { searchTracks } from "@/lib/youtube/search";
import { searchRooms } from "@/lib/rooms/queries";
import type { Track } from "@/lib/tracks";
import type { RoomSummary } from "@/lib/rooms/types";

/**
 * Unified dashboard search.
 *
 *   POST { q } → { tracks: Track[], rooms: RoomSummary[], error? }
 *
 * Tracks come from a server-side YouTube search (the key never reaches the
 * browser); rooms are name matches the viewer is allowed to see. Both run
 * concurrently and degrade independently — a YouTube failure still returns rooms.
 */
export async function POST(request: Request) {
  const viewer = await getRoomViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let q: unknown;
  try {
    ({ q } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof q !== "string" || q.trim().length < 2) {
    return NextResponse.json({ tracks: [], rooms: [] });
  }
  const query = q.trim();

  const [rooms, trackResult] = await Promise.all([
    searchRooms(query, viewer.id).catch(() => [] as RoomSummary[]),
    searchTracks(query, 18).then(
      (hits) => ({ hits, error: null as string | null }),
      (err) => ({
        hits: [] as Awaited<ReturnType<typeof searchTracks>>,
        error: err instanceof Error ? err.message : "Search failed.",
      }),
    ),
  ]);

  // Shape hits as ready-to-play catalog tracks (id = youtubeId, no DB row needed).
  const tracks: Track[] = trackResult.hits.map((h) => ({
    id: h.youtubeId,
    youtubeId: h.youtubeId,
    title: h.title,
    artist: h.artist,
    genre: "search",
    thumbnailUrl: h.thumbnailUrl,
    isPlayable: true,
  }));

  return NextResponse.json({
    tracks,
    rooms,
    error: trackResult.error ?? undefined,
  });
}
