import { NextResponse } from "next/server";

import { getCurrentAdForRoom } from "@/lib/business/ad-serving";

/**
 * Read-only: the ad currently on air for whatever this room is playing, or
 * `{ ad: null }`. For companion views (e.g. phones joined to a zone) that want
 * to mirror the venue's ads — it never starts an airing or counts a play.
 * Realtime subscribers can read the same snapshot from `active_ad` on the
 * room/zone/schedule playback row instead of polling.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const ad = await getCurrentAdForRoom(roomId);
  return NextResponse.json({ ad }, { headers: { "Cache-Control": "no-store" } });
}
