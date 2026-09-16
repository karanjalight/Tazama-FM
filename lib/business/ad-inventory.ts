/**
 * Pure Ad Inventory math — whether a campaign covers a screen, a screen's
 * availability, and how many hours of a given day are booked. Client-safe,
 * no I/O, unit-tested (ad-inventory.test.ts).
 */
import { normalizeTime, timeToMinutes, type CampaignWindow } from "./ad-scheduling";

export type ScreenAvailability = "Available" | "Booked" | "Restricted";

export interface InventoryTarget {
  locationIds: string[];
  zoneIds: string[];
  roomIds: string[];
  screenIds: string[];
}

export interface InventoryScreenRef {
  id: string;
  branchId: string;
  zoneId: string | null;
  roomId: string | null;
}

export function targetCoversScreen(target: InventoryTarget, screen: InventoryScreenRef): boolean {
  if (target.screenIds.includes(screen.id)) return true;
  if (screen.roomId && target.roomIds.includes(screen.roomId)) return true;
  if (screen.zoneId && target.zoneIds.includes(screen.zoneId)) return true;
  return target.locationIds.includes(screen.branchId);
}

/**
 * Restricted: ads are switched off for the screen or its whole location.
 * Booked: at least one active campaign covering it runs today.
 * Available: sellable and nothing booked on it today.
 */
export function screenAvailability(input: {
  adsEnabled: boolean;
  locationAllowsAds: boolean;
  bookedTodayCount: number;
}): ScreenAvailability {
  if (!input.adsEnabled || !input.locationAllowsAds) return "Restricted";
  return input.bookedTodayCount > 0 ? "Booked" : "Available";
}

export function isDateInRange(window: Pick<CampaignWindow, "startDate" | "endDate">, isoDate: string): boolean {
  if (window.startDate && isoDate < window.startDate) return false;
  if (window.endDate && isoDate > window.endDate) return false;
  return true;
}

export function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Minute intervals [start, end) inside one day for a daily active window;
 * an overnight window contributes both its evening and early-morning part. */
function dailyIntervals(window: Pick<CampaignWindow, "activeStartTime" | "activeEndTime">): [number, number][] {
  const start = timeToMinutes(normalizeTime(window.activeStartTime));
  const end = timeToMinutes(normalizeTime(window.activeEndTime));
  if (start == null && end == null) return [[0, 1440]];
  if (start != null && end == null) return [[start, 1440]];
  if (start == null && end != null) return [[0, end]];
  if (start === end) return [[0, 1440]];
  if (start! < end!) return [[start!, end!]];
  return [
    [start!, 1440],
    [0, end!],
  ];
}

/** Booked minutes on `isoDate` — the UNION of every window running that day,
 * so two overlapping campaigns never book more than the day has. */
export function bookedMinutesOnDate(windows: CampaignWindow[], isoDate: string): number {
  const intervals = windows.filter((w) => isDateInRange(w, isoDate)).flatMap(dailyIntervals);
  if (!intervals.length) return 0;
  intervals.sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [curStart, curEnd] = intervals[0];
  for (const [s, e] of intervals.slice(1)) {
    if (s <= curEnd) {
      curEnd = Math.max(curEnd, e);
    } else {
      total += curEnd - curStart;
      [curStart, curEnd] = [s, e];
    }
  }
  return total + (curEnd - curStart);
}
