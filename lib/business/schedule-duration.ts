/**
 * Pure duration math for a Schedule session — no DB access, so the wizard's
 * live "Schedule duration / Playlist duration / Remaining" readout (client)
 * and the create/update action's server-side validation (Part 4) share the
 * exact same numbers and can never disagree.
 *
 * "Calculate using the actual duration of the selected tracks/content, not
 * song count" (the feature's own explicit requirement) — every function
 * here sums real seconds (`Track.durationSeconds` / a content item's
 * `displaySeconds` or its own `durationSeconds`), never a plain item count.
 *
 * Takes narrow structural shapes (not the full `ScheduleSession` read type)
 * so the create/update action can build minimal inputs straight from
 * resolved id→duration maps, without first assembling a complete session.
 */
export type DurationStatus = "short" | "exact" | "over" | "open";

export interface DurationSummary {
  /** The session's own time window, in seconds (end_time - start_time). */
  windowSeconds: number;
  /** Sum of real seconds actually selected for this layer. */
  scheduledSeconds: number;
  /** How many items contribute an unknown (not-yet-resolved) duration —
   * surfaced so the UI can say "3 tracks have an unknown length" rather than
   * silently under-counting them as zero. */
  unresolvedCount: number;
  /** Only set when this layer's total must fill the window exactly
   * (playlist always; content only when it doesn't loop) — null means the
   * layer is open-ended (e.g. looping content) and has nothing to compare
   * `scheduledSeconds` against. */
  requiredSeconds: number | null;
  remainingSeconds: number | null;
  status: DurationStatus;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** A session's own time-of-day window, in seconds. Sessions never wrap past
 * midnight (enforced at creation by `findOverlappingSession`'s "startTime <
 * endTime" rule), so this is always non-negative. */
export function sessionWindowSeconds(session: { startTime: string; endTime: string }): number {
  return Math.max(0, (toMinutes(session.endTime) - toMinutes(session.startTime)) * 60);
}

function statusFor(scheduledSeconds: number, requiredSeconds: number | null): DurationStatus {
  if (requiredSeconds === null) return "open";
  if (scheduledSeconds < requiredSeconds) return "short";
  if (scheduledSeconds > requiredSeconds) return "over";
  return "exact";
}

/** Real total playlist duration for a session — always required to fill the
 * session's window exactly (a schedule's music can't leave dead air). */
export function playlistDurationSummary(session: {
  startTime: string;
  endTime: string;
  playlistEnabled: boolean;
  songs: { durationSeconds: number | null }[];
}): DurationSummary {
  const windowSeconds = sessionWindowSeconds(session);
  let scheduledSeconds = 0;
  let unresolvedCount = 0;
  for (const s of session.songs) {
    if (s.durationSeconds == null) unresolvedCount += 1;
    else scheduledSeconds += s.durationSeconds;
  }
  const requiredSeconds = session.playlistEnabled ? windowSeconds : null;
  return {
    windowSeconds,
    scheduledSeconds,
    unresolvedCount,
    requiredSeconds,
    remainingSeconds: requiredSeconds === null ? null : requiredSeconds - scheduledSeconds,
    status: statusFor(scheduledSeconds, requiredSeconds),
  };
}

/** Real total content duration for a session. Only "required to fill the
 * window" when the content layer plays `once` (a `loop` sequence is
 * open-ended by design — it just keeps cycling for as long as the session
 * runs, so there's nothing to validate it against). */
export function contentDurationSummary(session: {
  startTime: string;
  endTime: string;
  contentEnabled: boolean;
  contentRepeat: string;
  content: { durationSeconds: number | null }[];
}): DurationSummary {
  const windowSeconds = sessionWindowSeconds(session);
  let scheduledSeconds = 0;
  let unresolvedCount = 0;
  for (const c of session.content) {
    if (c.durationSeconds == null) unresolvedCount += 1;
    else scheduledSeconds += c.durationSeconds;
  }
  const requiredSeconds = session.contentEnabled && session.contentRepeat === "once" ? windowSeconds : null;
  return {
    windowSeconds,
    scheduledSeconds,
    unresolvedCount,
    requiredSeconds,
    remainingSeconds: requiredSeconds === null ? null : requiredSeconds - scheduledSeconds,
    status: statusFor(scheduledSeconds, requiredSeconds),
  };
}

export interface HHMMSS {
  hours: number;
  minutes: number;
  seconds: number;
}

export function toHHMMSS(totalSeconds: number): HHMMSS {
  const sign = totalSeconds < 0 ? -1 : 1;
  const abs = Math.abs(Math.round(totalSeconds));
  return { hours: sign * Math.floor(abs / 3600), minutes: Math.floor((abs % 3600) / 60), seconds: abs % 60 };
}

/** "2h 42m" / "18m" / "45s" — the single duration-string format the whole
 * feature uses (fixes the old duration-utils.ts mock's hour-rollover bug and
 * the session-utils.ts mock's separate, inconsistent format). */
export function formatDurationSeconds(totalSeconds: number): string {
  const { hours, minutes, seconds } = toHHMMSS(totalSeconds);
  const parts: string[] = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes || hours) parts.push(`${String(minutes).padStart(hours ? 2 : 1, "0")}m`);
  if (!hours && !minutes) parts.push(`${seconds}s`);
  return parts.join(" ") || "0s";
}
