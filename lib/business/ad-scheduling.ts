/**
 * Pure decision logic for live ad serving — which campaign is due, which
 * players an airing covers, whether it may pause music, and local-time math.
 * No I/O and no `@/` imports, so it runs on client + server and compiles
 * standalone for `node --test` (see ad-scheduling.test.ts).
 */
import type { ActiveAdSnapshot, AdContentType, AdPlayer } from "./ad-types";

/** How long past `endsAt` an airing may linger before any tick treats it as
 * abandoned (a kiosk that crashed mid-ad never sent its `end` impression). */
export const AD_STALE_GRACE_MS = 30_000;
export const DEFAULT_TIMED_AD_SECONDS = 30;
export const DEFAULT_IMAGE_AD_SECONDS = 15;

export function adDurationSeconds(
  contentType: AdContentType,
  mediaDurationSeconds: number | null,
  displaySeconds: number | null,
): number {
  const positive = (n: number | null) => (n != null && Number.isFinite(n) && n > 0 ? Math.round(n) : null);
  if (contentType === "video" || contentType === "audio") {
    return positive(mediaDurationSeconds) ?? positive(displaySeconds) ?? DEFAULT_TIMED_AD_SECONDS;
  }
  return positive(displaySeconds) ?? positive(mediaDurationSeconds) ?? DEFAULT_IMAGE_AD_SECONDS;
}

/** Only an airing that covers EVERY room on the source may freeze it — a
 * partial one would silence screens that aren't showing the ad. Image and
 * document ads never pause music. */
export function adPausesMusic(contentType: AdContentType, roomIds: string[] | null): boolean {
  return (contentType === "video" || contentType === "audio") && roomIds === null;
}

export function adShowsOnPlayer(ad: Pick<ActiveAdSnapshot, "roomIds" | "screenIds">, player: AdPlayer): boolean {
  if (ad.roomIds === null) return true;
  if (ad.roomIds.includes(player.roomId)) return true;
  return player.deviceId != null && ad.screenIds.includes(player.deviceId);
}

export function isAdStale(ad: Pick<ActiveAdSnapshot, "endsAt">, nowMs: number): boolean {
  return nowMs > new Date(ad.endsAt).getTime() + AD_STALE_GRACE_MS;
}

// ── Local time ──────────────────────────────────────────────────────────

export interface LocalDateParts {
  /** YYYY-MM-DD */
  isoDate: string;
  /** HH:MM:SS, 24h */
  hms: string;
  hour: number;
  /** 0 = Monday … 6 = Sunday */
  weekday: number;
  msSinceMidnight: number;
}

const WEEKDAY_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

export function localDateParts(timezone: string | null, now: Date): LocalDateParts {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  };
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", { ...options, timeZone: timezone || "Africa/Nairobi" }).formatToParts(now);
  } catch {
    parts = new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).formatToParts(now);
  }
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));
  const second = Number(get("second"));
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    isoDate: `${get("year")}-${get("month")}-${get("day")}`,
    hms: `${pad(hour)}:${pad(minute)}:${pad(second)}`,
    hour,
    weekday: WEEKDAY_INDEX[get("weekday")] ?? 0,
    msSinceMidnight: ((hour * 60 + minute) * 60 + second) * 1000 + now.getMilliseconds(),
  };
}

/** The UTC instant of local midnight "today" in `timezone`. */
export function startOfLocalDayMs(timezone: string | null, now: Date): number {
  return now.getTime() - localDateParts(timezone, now).msSinceMidnight;
}

/** "HH:MM" or "HH:MM:SS" → "HH:MM:SS"; anything else → null. */
export function normalizeTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(value.trim());
  if (!m) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}:${m[3] ?? "00"}`;
}

export function timeToMinutes(value: string | null | undefined): number | null {
  const t = normalizeTime(value);
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// ── Campaign eligibility ────────────────────────────────────────────────

export interface CampaignWindow {
  startDate: string | null;
  endDate: string | null;
  activeStartTime: string | null;
  activeEndTime: string | null;
}

/** Date range (inclusive) + daily active hours. A window whose end is
 * earlier than its start runs overnight (20:00 → 02:00). */
export function isWithinCampaignWindow(window: CampaignWindow, local: Pick<LocalDateParts, "isoDate" | "hms">): boolean {
  if (window.startDate && local.isoDate < window.startDate) return false;
  if (window.endDate && local.isoDate > window.endDate) return false;

  const start = normalizeTime(window.activeStartTime);
  const end = normalizeTime(window.activeEndTime);
  const now = local.hms;
  if (!start && !end) return true;
  if (start && !end) return now >= start;
  if (!start && end) return now < end;
  if (start === end) return true;
  if (start! < end!) return now >= start! && now < end!;
  return now >= start! || now < end!;
}

export function parseFrequencyMinutes(value: string | null): number | null {
  if (!value) return null;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

export type AdPriority = "low" | "normal" | "high" | "critical";
const PRIORITY_RANK: Record<AdPriority, number> = { critical: 4, high: 3, normal: 2, low: 1 };

export interface DueCandidate {
  id: string;
  priority: string;
  frequencyMinutes: number | null;
  maxPlaysPerDay: number | null;
}

/** Airing history of one campaign on one playback source. */
export interface SourceHistory {
  lastStartedAtMs: number | null;
  todayCount: number;
}

/** Every candidate that's due right now, best first: highest priority, then
 * whichever has waited longest (never-aired first). A campaign with no
 * frequency configured is never due — it has no cadence to air on. */
export function rankDueCampaigns<T extends DueCandidate>(
  candidates: T[],
  history: Map<string, SourceHistory>,
  nowMs: number,
): T[] {
  const due = candidates.filter((c) => {
    if (c.frequencyMinutes == null || c.frequencyMinutes < 1) return false;
    const h = history.get(c.id);
    if (c.maxPlaysPerDay != null && (h?.todayCount ?? 0) >= c.maxPlaysPerDay) return false;
    if (h?.lastStartedAtMs == null) return true;
    return nowMs - h.lastStartedAtMs >= c.frequencyMinutes * 60_000;
  });
  const rank = (p: string) => PRIORITY_RANK[p as AdPriority] ?? PRIORITY_RANK.normal;
  return due.sort((a, b) => {
    const byPriority = rank(b.priority) - rank(a.priority);
    if (byPriority !== 0) return byPriority;
    const aLast = history.get(a.id)?.lastStartedAtMs ?? null;
    const bLast = history.get(b.id)?.lastStartedAtMs ?? null;
    if (aLast === bLast) return 0;
    if (aLast === null) return -1;
    if (bLast === null) return 1;
    return aLast - bLast;
  });
}

// ── Airing targets ──────────────────────────────────────────────────────

export interface FollowingRoom {
  id: string;
  /** `branches.allow_ads` of the room's location. */
  allowsAds: boolean;
}

export interface FollowingScreen {
  id: string;
  roomId: string;
  adsEnabled: boolean;
}

export interface BreakTargets {
  roomIds: string[] | null;
  screenIds: string[];
}

/**
 * Which players an airing covers, given every room/screen following the
 * playback source and the campaign's coverage:
 *  - `roomCovered`: rooms covered at room, zone or location level;
 *  - `screenTargeted`: screens picked individually.
 * A room is "fully" covered when it's room-level covered, its location allows
 * ads and none of its screens has ads switched off — only then can unpaired
 * players in it show the ad. If every room is fully covered the airing is a
 * full break (`roomIds: null`). Returns null when nothing is covered.
 */
export function resolveBreakTargets(input: {
  rooms: FollowingRoom[];
  screens: FollowingScreen[];
  roomCovered: Set<string>;
  screenTargeted: Set<string>;
}): BreakTargets | null {
  const { rooms, screens, roomCovered, screenTargeted } = input;
  const roomsWithDisabledScreens = new Set(screens.filter((s) => !s.adsEnabled).map((s) => s.roomId));
  const allowsAds = new Map(rooms.map((r) => [r.id, r.allowsAds]));

  const fullRooms = rooms
    .filter((r) => r.allowsAds && roomCovered.has(r.id) && !roomsWithDisabledScreens.has(r.id))
    .map((r) => r.id);
  if (rooms.length > 0 && fullRooms.length === rooms.length) return { roomIds: null, screenIds: [] };

  const full = new Set(fullRooms);
  const screenIds = screens
    .filter(
      (s) =>
        s.adsEnabled &&
        allowsAds.get(s.roomId) === true &&
        !full.has(s.roomId) &&
        (screenTargeted.has(s.id) || roomCovered.has(s.roomId)),
    )
    .map((s) => s.id);

  if (!fullRooms.length && !screenIds.length) return null;
  return { roomIds: fullRooms, screenIds };
}
