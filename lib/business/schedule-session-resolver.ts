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
