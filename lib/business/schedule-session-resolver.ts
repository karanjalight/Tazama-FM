/**
 * Pure "which session applies right now" resolution. Schedule activation is
 * manual (staff clicks Activate, mirroring Audio Zone's status toggle) — but
 * *which* session's content/playlist plays while active is resolved live
 * from the day's time-of-day blocks, exactly matching the wizard's own
 * "Daily Schedule" framing. No DB access; safe on client + server.
 */
import type { ScheduleSession } from "@/lib/business/schedule-types";

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** The session whose [startTime, endTime) window contains `nowHHMM`, or null
 * when the active schedule simply has no session covering this moment (the
 * kiosk falls back to normal Zone/Room playback exactly as if the schedule
 * weren't active — no silent dead air, no fabricated session). */
export function resolveCurrentSession(
  sessions: ScheduleSession[],
  nowHHMM: string,
): ScheduleSession | null {
  const now = toMinutes(nowHHMM);
  for (const session of sessions) {
    const start = toMinutes(session.startTime);
    const end = toMinutes(session.endTime);
    if (start <= now && now < end) return session;
  }
  return null;
}

/** "HH:MM" for the current instant in an IANA timezone — what a schedule's
 * own `timezone` field needs for the resolution above. Falls back to the
 * server's local time if the zone string is somehow invalid rather than
 * throwing (a schedule should never go silent over a bad timezone string). */
export function currentHHMMInTimezone(timezone: string, now: Date = new Date()): string {
  const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: false };
  try {
    return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: timezone }).format(now);
  } catch {
    return new Intl.DateTimeFormat("en-GB", opts).format(now);
  }
}

/**
 * How long until `session`'s own end time, in whole seconds — the boundary a
 * kiosk/zone-room needs to know about *in addition* to whatever's currently
 * showing's own duration. Without this, a session change (e.g. a signage
 * block ending and handing back to the next session's playlist) only ever
 * gets noticed whenever the *previous* content item's own `displaySeconds`
 * timer happens to expire — which can be much later than the session's real
 * end time if a block was resized/edited after its content's duration was
 * set. Minute-granularity like the rest of the schedule model (session times
 * are "HH:MM" only) — callers should add a small buffer before arming a
 * timer from this so rounding never fires a fraction of a second early.
 */
export function secondsUntilSessionEnd(session: ScheduleSession, timezone: string, now: Date = new Date()): number {
  const nowMinutes = toMinutes(currentHHMMInTimezone(timezone, now));
  const endMinutes = toMinutes(session.endTime);
  return Math.max(0, endMinutes - nowMinutes) * 60;
}
