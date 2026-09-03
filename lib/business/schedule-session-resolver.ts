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

/** The IANA zone's UTC offset (minutes) at `now` — e.g. Africa/Nairobi -> -180
 * (i.e. UTC+3, expressed the way `Date.UTC` arithmetic below wants it: how
 * much to SUBTRACT from a naive UTC timestamp to get the real instant). */
function utcOffsetMinutes(timezone: string, now: Date): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "longOffset" }).formatToParts(now);
    const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+00:00";
    const match = /GMT([+-])(\d{2}):(\d{2})/.exec(raw);
    if (!match) return 0;
    const sign = match[1] === "-" ? -1 : 1;
    return sign * (Number(match[2]) * 60 + Number(match[3]));
  } catch {
    return 0;
  }
}

/**
 * Real epoch-ms instant of `session.startTime` on *today* (today meaning
 * "today in `timezone`, as of `now`") — unlike everything else in this
 * module, which only ever compares "HH:MM" strings at minute granularity,
 * this gives sub-minute precision for measuring elapsed time SINCE a
 * session began (what a "every N minutes" periodic content interruption —
 * see `schedule-playback.ts`'s `advanceScheduleContent` — needs to place an
 * interruption partway through a minute, not just which minute it's in).
 * The session boundary itself is still only as precise as "HH:MM" (an
 * existing, accepted limitation of the whole schedule model) — this just
 * stops that imprecision from *compounding* every time elapsed-since-start
 * is recomputed.
 */
export function sessionStartInstantMs(session: ScheduleSession, timezone: string, now: Date = new Date()): number {
  const dateParts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => Number(dateParts.find((p) => p.type === type)?.value ?? 0);
  const [hour, minute] = session.startTime.split(":").map(Number);
  const offsetMinutes = utcOffsetMinutes(timezone, now);
  return Date.UTC(get("year"), get("month") - 1, get("day"), hour || 0, minute || 0, 0) - offsetMinutes * 60_000;
}
