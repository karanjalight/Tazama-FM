/**
 * Pure rules for airing Announcements on branch kiosks — no database, no
 * React, safe on client + server (unit-tested in announcement-airing.test.ts).
 *
 * An announcement "airs" when it is sent now, or when a scheduled/repeating
 * one comes due. Airing overrides everything on a kiosk (ads, signage, guest
 * requests) and stops or ducks the music until it ends. Delivery is a realtime
 * "check now" ping per room plus a ~25s kiosk poll; the poll is also what fires
 * scheduled announcements (see lib/business/announcement-firing.ts).
 */
import { localDateParts, startOfLocalDayMs } from "./ad-scheduling";

/** How long after firing a kiosk that missed the ping (reconnecting, just
 * booted) still plays it. Past this, a screen that was offline skips it
 * rather than blaring a stale announcement hours later. */
export const ANNOUNCEMENT_FRESH_MS = 90_000;

export const ANNOUNCEMENT_PING_EVENT = "announcement";

/** Public broadcast channel a room's kiosks listen on. The ping carries no
 * audio — kiosks always fetch the airing from the server, so a spoofed ping
 * can at most make a screen re-check. */
export function announcementChannelName(roomId: string): string {
  return `announce:${roomId}`;
}

/** Everything a kiosk needs to play one airing of an announcement. */
export interface AnnouncementAiring {
  /** `${announcementId}:${firedAtMs}` — a resend or the next repeat is a new airing. */
  airingId: string;
  announcementId: string;
  title: string;
  /** DB category value (`emergency`, `promotion`, …). */
  category: string;
  description: string;
  audioUrl: string | null;
  durationSeconds: number;
  playbackMode: "pause" | "reduce";
  reducedVolumePercent: number;
  firedAt: string;
}

export function airingIdFor(announcementId: string, firedAt: string): string {
  return `${announcementId}:${Date.parse(firedAt)}`;
}

export interface AnnouncementFiringRow {
  status: string;
  repeat: string;
  scheduled_at: string | null;
  sent_at: string | null;
}

export type FiringDecision =
  /** Already fired recently — deliver the existing airing. */
  | { kind: "on-air"; firedAt: string }
  /** Due now and not yet fired for this occurrence — claim it. `occurrenceAt`
   * is the occurrence's own start, which the claim compares `sent_at` against. */
  | { kind: "fire"; occurrenceAt: string; repeating: boolean }
  | { kind: "none" };

function isFresh(firedAtMs: number, nowMs: number): boolean {
  return nowMs >= firedAtMs - 5_000 && nowMs - firedAtMs < ANNOUNCEMENT_FRESH_MS;
}

/** 0 = Monday … 6 = Sunday (matches `localDateParts`). */
export function repeatMatchesDay(repeat: string, weekday: number, startWeekday: number): boolean {
  switch (repeat) {
    case "weekdays":
      return weekday <= 4;
    case "weekends":
      return weekday >= 5;
    case "weekly":
      return weekday === startWeekday;
    // "custom" has no stored day set yet — it behaves like "daily".
    case "daily":
    case "custom":
      return true;
    default:
      return false;
  }
}

/**
 * What an announcement should do at `now`. Repeating occurrences happen at the
 * start's local time-of-day in `timezone`, never before the start itself, and
 * `sent_at` doubles as "last fired" so each occurrence fires once.
 */
export function decideFiring(row: AnnouncementFiringRow, timezone: string | null, now: Date): FiringDecision {
  const nowMs = now.getTime();
  const sentMs = row.sent_at ? Date.parse(row.sent_at) : NaN;

  if (row.status === "sent") {
    return Number.isFinite(sentMs) && isFresh(sentMs, nowMs) ? { kind: "on-air", firedAt: row.sent_at! } : { kind: "none" };
  }
  if (row.status !== "scheduled" || !row.scheduled_at) return { kind: "none" };

  const startMs = Date.parse(row.scheduled_at);
  if (!Number.isFinite(startMs)) return { kind: "none" };

  if (!row.repeat || row.repeat === "none") {
    return nowMs >= startMs && nowMs - startMs < ANNOUNCEMENT_FRESH_MS
      ? { kind: "fire", occurrenceAt: row.scheduled_at, repeating: false }
      : { kind: "none" };
  }

  const start = localDateParts(timezone, new Date(startMs));
  const todayOccurrenceMs = startOfLocalDayMs(timezone, now) + start.msSinceMidnight;
  // Yesterday's too, so an occurrence just before local midnight is still
  // caught by a poll just after it.
  for (const occurrenceMs of [todayOccurrenceMs, todayOccurrenceMs - 24 * 60 * 60 * 1000]) {
    if (nowMs < occurrenceMs || nowMs - occurrenceMs >= ANNOUNCEMENT_FRESH_MS) continue;
    if (occurrenceMs < startMs - 1_000) continue;
    const weekday = localDateParts(timezone, new Date(occurrenceMs)).weekday;
    if (!repeatMatchesDay(row.repeat, weekday, start.weekday)) continue;
    if (Number.isFinite(sentMs) && sentMs >= occurrenceMs) {
      return isFresh(sentMs, nowMs) ? { kind: "on-air", firedAt: row.sent_at! } : { kind: "none" };
    }
    return { kind: "fire", occurrenceAt: new Date(occurrenceMs).toISOString(), repeating: true };
  }
  return { kind: "none" };
}

export interface RoomPlacement {
  roomId: string;
  branchId: string | null;
  zoneId: string | null;
  audioZoneIds: string[];
}

export interface AnnouncementTargetIds {
  locationIds: string[];
  zoneIds: string[];
  roomIds: string[];
  audioZoneIds: string[];
}

/** Whether an announcement's target reaches this room, directly or through
 * its location, zone, or an audio zone it belongs to. */
export function targetCoversRoom(target: AnnouncementTargetIds, room: RoomPlacement): boolean {
  if (target.roomIds.includes(room.roomId)) return true;
  if (room.branchId && target.locationIds.includes(room.branchId)) return true;
  if (room.zoneId && target.zoneIds.includes(room.zoneId)) return true;
  return room.audioZoneIds.some((id) => target.audioZoneIds.includes(id));
}

/** Music volume (0–100) while an announcement plays — silent for "pause",
 * the chosen share of the screen's own volume for "reduce". */
export function duckedVolume(volume: number, airing: Pick<AnnouncementAiring, "playbackMode" | "reducedVolumePercent">): number {
  if (airing.playbackMode === "pause") return 0;
  const pct = Math.min(100, Math.max(0, airing.reducedVolumePercent));
  return Math.round((Math.min(100, Math.max(0, volume)) * pct) / 100);
}
