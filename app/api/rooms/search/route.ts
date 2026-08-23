import { NextResponse } from "next/server";

import { getRoomViewer } from "@/lib/rooms/viewer";
import { getOrCreateGuestViewer } from "@/lib/rooms/guest-session";
import { searchTracks } from "@/lib/youtube/search";
import type { RoomTrack } from "@/lib/rooms/types";

/** POST { q } → { tracks } — free-text YouTube search to add a track to a room.
 * A branch's room page lets anonymous guests add songs (see the room page's
 * guest-fallback viewer resolution), so this must accept them too — search
 * results aren't room-specific or sensitive, so a guest identity is enough. */
export async function POST(request: Request) {
  const viewer = (await getRoomViewer()) ?? (await getOrCreateGuestViewer());
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
    return NextResponse.json({ tracks: [] });
  }

  try {
    const hits = await searchTracks(q.trim(), 12);
    const tracks: RoomTrack[] = hits.map((h) => ({
      youtubeId: h.youtubeId,
      title: h.title,
      artist: h.artist,
      thumbnailUrl: h.thumbnailUrl,
    }));
    return NextResponse.json({ tracks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed.";
    return NextResponse.json({ tracks: [], error: message }, { status: 502 });
  }
}
