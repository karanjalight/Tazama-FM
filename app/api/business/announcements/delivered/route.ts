import { NextResponse } from "next/server";

import { recordAnnouncementDelivery } from "@/lib/business/announcement-firing";

/**
 * Kiosk-facing, unauthenticated — a paired screen's receipt that it started
 * playing an announcement airing. Feeds `announcement_deliveries`, which the
 * Announcements dashboard's delivery stats aggregate over.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { announcementId, firedAt, roomId, deviceToken, playbackMode } = body;
  if (typeof announcementId !== "string" || !announcementId || typeof roomId !== "string" || !roomId) {
    return NextResponse.json({ error: "Missing announcementId or roomId." }, { status: 400 });
  }
  if (typeof firedAt !== "string") return NextResponse.json({ error: "Missing firedAt." }, { status: 400 });

  const result = await recordAnnouncementDelivery({
    announcementId,
    firedAt,
    roomId,
    deviceToken: typeof deviceToken === "string" && deviceToken ? deviceToken : null,
    playbackMode: playbackMode === "reduce" ? "reduce" : "pause",
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, recorded: result.recorded });
}
