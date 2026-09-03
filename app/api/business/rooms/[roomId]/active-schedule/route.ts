import { NextResponse } from "next/server";

import { listActiveSchedulesCoveringRoom } from "@/lib/business/schedule-queries";
import {
  resolveCurrentSession,
  currentHHMMInTimezone,
  secondsUntilSessionEnd,
  sessionStartInstantMs,
} from "@/lib/business/schedule-session-resolver";
import { resolvePeriodicContent } from "@/lib/business/schedule-playback";

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
      // A `periodic` session's stored `schedule_playback.content` can be
      // stale (or null, mid-"waiting for the next interruption") by the time
      // a fresh client discovers it here — this is a read-only discovery
      // poll, not an advance, so it doesn't correct that stored row itself,
      // but it CAN tell the client when to next call advance-content so
      // that call lands at the right moment instead of only ever being
      // driven by the (in this case wrong) session-boundary fallback.
      let contentRecheckInSeconds: number | null = null;
      if (session.contentFrequencyMode === "periodic") {
        const ordered = [...session.content].sort((a, b) => a.position - b.position);
        const elapsedMs = Date.now() - sessionStartInstantMs(session, schedule.timezone);
        contentRecheckInSeconds = resolvePeriodicContent(
          ordered,
          session.contentRepeat,
          session.contentFrequencyIntervalMinutes ?? 30,
          elapsedMs,
        ).recheckInSeconds;
      }

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
        // How long until THIS session's own end time — the kiosk uses this
        // to cap its content/track advance timers so a session boundary is
        // noticed on time instead of only whenever whatever's already
        // showing happens to finish on its own (see schedule-playback.ts).
        sessionEndsInSeconds: secondsUntilSessionEnd(session, schedule.timezone),
        contentRecheckInSeconds,
      });
    }
  }

  return NextResponse.json({ scheduleId: null });
}
