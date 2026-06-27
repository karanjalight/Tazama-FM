import { NextResponse } from "next/server";

import { getRoomViewer } from "@/lib/rooms/viewer";
import { buildSuggestions } from "@/lib/rooms/suggestions";

/**
 * POST { curatedGenres, roomGenres, exclude } → { tracks }
 * Taste-aware "up next" pool for a room, computed from the collective genre
 * preferences of who's currently present (sent by the client from presence).
 */
export async function POST(request: Request) {
  const viewer = await getRoomViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    curatedGenres?: unknown;
    roomGenres?: unknown;
    exclude?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const asStrings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  try {
    const tracks = await buildSuggestions({
      curatedGenres: asStrings(body.curatedGenres),
      roomGenres: asStrings(body.roomGenres),
      exclude: asStrings(body.exclude),
    });
    return NextResponse.json({ tracks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Suggestions failed.";
    return NextResponse.json({ tracks: [], error: message }, { status: 502 });
  }
}
