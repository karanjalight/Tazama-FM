import { NextResponse } from "next/server";

import { getDueAnnouncementsForRoom } from "@/lib/business/announcement-firing";

/**
 * Kiosk-facing, unauthenticated — same trust model as the ad tick and
 * active-schedule. A branch kiosk calls this on every realtime "check now"
 * ping and on a ~25s poll. Returns the announcement airings this room should
 * be playing right now, and fires any scheduled/repeating announcement that
 * has just come due (see lib/business/announcement-firing.ts).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const airings = await getDueAnnouncementsForRoom(roomId);
  return NextResponse.json({ airings }, { headers: { "Cache-Control": "no-store" } });
}
