/**
 * Client-safe shapes and constants for advertising analytics — the server
 * reads live in lib/business/ad-analytics.ts (which re-exports these).
 */
import { addDaysIso } from "./ad-inventory";
import type { CampaignStatus } from "./campaign-types";

// ── Public shapes (all plain JSON — safe to pass to client components) ──

export interface AdMetricTotals {
  plays: number;
  completed: number;
  completionPct: number;
  airings: number;
  views: number;
  reach: number;
  revenue: number;
}

export interface AdDailyPoint {
  date: string;
  plays: number;
  views: number;
  reach: number;
  revenue: number;
}

export interface AdBreakdownRow extends AdMetricTotals {
  id: string;
  name: string;
  /** e.g. "Nairobi CBD · Main Floor" for a room. */
  context: string | null;
}

export interface AdCampaignStats extends AdMetricTotals {
  campaignId: string;
  playsToday: number;
}

export interface AdHeatCell {
  /** 0 = Monday … 6 = Sunday */
  weekday: number;
  hour: number;
  plays: number;
}

export interface AdInsight {
  id: string;
  title: string;
  body: string;
}

/** The ranges the Ad Performance page offers. */
export const AD_RANGES = ["Today", "Last 7 days", "Last 30 days", "Last 90 days"] as const;
export type AdRange = (typeof AD_RANGES)[number];

/** Every range the business dashboard uses anywhere (Analytics and Reports
 * add calendar windows), each resolved to real local dates. */
export const AD_WINDOW_RANGES = [
  "Today",
  "Yesterday",
  "Last 7 days",
  "Last 30 days",
  "Last 90 days",
  "This month",
  "Previous month",
] as const;
export type AdWindowRange = (typeof AD_WINDOW_RANGES)[number];

export interface AdWindow {
  /** Inclusive local dates, YYYY-MM-DD. */
  fromDate: string;
  toDate: string;
  days: number;
}

function daysBetweenInclusive(fromDate: string, toDate: string): number {
  return Math.round((Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86_400_000) + 1;
}

/** Unknown ranges fall back to the last 30 days. */
export function resolveAdWindow(range: string, todayIso: string): AdWindow {
  const window = (fromDate: string, toDate: string): AdWindow => ({ fromDate, toDate, days: daysBetweenInclusive(fromDate, toDate) });
  const firstOfMonth = `${todayIso.slice(0, 7)}-01`;
  switch (range as AdWindowRange) {
    case "Today":
      return window(todayIso, todayIso);
    case "Yesterday": {
      const yesterday = addDaysIso(todayIso, -1);
      return window(yesterday, yesterday);
    }
    case "Last 7 days":
      return window(addDaysIso(todayIso, -6), todayIso);
    case "Last 90 days":
      return window(addDaysIso(todayIso, -89), todayIso);
    case "This month":
      return window(firstOfMonth, todayIso);
    case "Previous month": {
      const lastOfPrevious = addDaysIso(firstOfMonth, -1);
      return window(`${lastOfPrevious.slice(0, 7)}-01`, lastOfPrevious);
    }
    default:
      return window(addDaysIso(todayIso, -29), todayIso);
  }
}

export interface AdCampaignSummary {
  id: string;
  name: string;
  advertiser: string | null;
  /** Display status for today (an active campaign before its start date reads as Scheduled). */
  status: CampaignStatus;
}

export interface AdAnalyticsFilters {
  range: AdWindowRange;
  locationId?: string | null;
  campaignId?: string | null;
  advertiser?: string | null;
}

export interface AdAnalytics {
  schemaReady: boolean;
  range: AdWindowRange;
  fromDate: string;
  toDate: string;
  totals: AdMetricTotals;
  previous: AdMetricTotals;
  daily: AdDailyPoint[];
  byCampaign: Record<string, AdCampaignStats>;
  byLocation: AdBreakdownRow[];
  byRoom: AdBreakdownRow[];
  byScreen: AdBreakdownRow[];
  heatmap: AdHeatCell[];
  insights: AdInsight[];
  advertisers: string[];
  campaigns: AdCampaignSummary[];
}

export function emptyTotals(): AdMetricTotals {
  return { plays: 0, completed: 0, completionPct: 0, airings: 0, views: 0, reach: 0, revenue: 0 };
}
