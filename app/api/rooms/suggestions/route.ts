import { NextResponse } from "next/server";

import { getRoomViewer } from "@/lib/rooms/viewer";
import { buildSuggestions } from "@/lib/rooms/suggestions";

/**
 * POST { roomGenres, participantGenres, exclude } → { tracks }
 * "Up Next" pool for a room, anchored on the room's own genres and re-weighted
 * by who's currently present (sent by the client from presence). `roomGenres` is
 * the universe; `participantGenres` is the flat member-taste list (with repeats).
 * Accepts the legacy `curatedGenres` field as a fallback for participantGenres.
 */
export async function POST(request: Request) {
  const viewer = await getRoomViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    roomGenres?: unknown;
    participantGenres?: unknown;
    curatedGenres?: unknown;
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
      roomGenres: asStrings(body.roomGenres),
      participantGenres: asStrings(body.participantGenres ?? body.curatedGenres),
      exclude: asStrings(body.exclude),
    });
    return NextResponse.json({ tracks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Suggestions failed.";
    return NextResponse.json({ tracks: [], error: message }, { status: 502 });
  }
}
