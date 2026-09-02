import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { advanceScheduleTrack } from "@/lib/business/schedule-playback";

/** Kiosk-facing, unauthenticated — mirrors
 * app/api/business/audio-zones/[zoneId]/advance/route.ts exactly, one level
 * up: music and visual content end independently, so a schedule gets two
 * advance routes instead of one (see advance-content/route.ts). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ scheduleId: string }> },
) {
  const { scheduleId } = await params;
  let reportedVersion: unknown;
  try {
    ({ reportedVersion } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof reportedVersion !== "number") {
    return NextResponse.json({ error: "Missing reportedVersion." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const result = await advanceScheduleTrack(admin, scheduleId, reportedVersion);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
  if (result.noActiveSession) return NextResponse.json({ noActiveSession: true });

  return NextResponse.json({ track: result.track ?? null, version: result.version, sessionEndsInSeconds: result.sessionEndsInSeconds });
}
