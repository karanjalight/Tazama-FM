import { NextResponse } from "next/server";

import { listActiveSchedulesCoveringRoom } from "@/lib/business/schedule-queries";
import { resolveCurrentSession, currentHHMMInTimezone } from "@/lib/business/schedule-session-resolver";

/**
 * Kiosk-facing, unauthenticated — polled by the kiosk player (~25s cadence,
 * matching its existing heartbeat interval) to decide whether an active
 * Schedule should override this room's normal Audio Zone / room playback
 * right now. "Covers this room" (targets it) and "is live right now" (has a
 * session whose time window contains the current moment) are both required
 * — a schedule that's `active` but between sessions reports as no override,
 * so the kiosk falls straight back to its normal source instead of showing
 * a blank screen.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;

  const candidates = await listActiveSchedulesCoveringRoom(roomId);
  for (const schedule of candidates) {
    const nowHHMM = currentHHMMInTimezone(schedule.timezone);
    const session = resolveCurrentSession(schedule.sessions, nowHHMM);
    if (session) {
      return NextResponse.json({
        scheduleId: schedule.id,
        sessionId: session.id,
        synchronizedPlayback: schedule.synchronizedPlayback,
        // The kiosk's realtime subscription (useSchedulePlayback) only fires
        // on the NEXT change to schedule_playback — this snapshot is what
        // lets it render something immediately on first discovering the
        // override, the same role `initialPlayback` plays for the room/zone
        // cases (both server-rendered up front; this one is discovered at
        // runtime via this very poll, so it has to carry its own snapshot).
        playback: schedule.playback,
      });
    }
  }

  return NextResponse.json({ scheduleId: null });
}
