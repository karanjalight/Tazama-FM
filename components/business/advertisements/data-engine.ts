/**
 * Seeded mock-data generator for Ad Performance — same technique as
 * components/business/analytics/data-engine.ts (mulberry32 PRNG seeded from
 * the filter combination), so changing a filter here deterministically
 * re-derives proportionate numbers instead of being decorative.
 */
import { CAMPAIGNS } from "./mock-data";
import { TARGET_TREE } from "./types";

export const AD_DATE_RANGES = ["Today", "Last 7 days", "Last 30 days", "Last 90 days"] as const;
export type AdDateRange = (typeof AD_DATE_RANGES)[number];

export interface AdFilters {
  dateRange: AdDateRange;
  locationId: string; // "all" or a TARGET_TREE id
  campaignId: string; // "all" or a Campaign id
  advertiser: string; // "All Advertisers" or a name
}

export const DEFAULT_AD_FILTERS: AdFilters = {
  dateRange: "Last 30 days",
  locationId: "all",
  campaignId: "all",
  advertiser: "All Advertisers",
};

function seedFromString(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function jitter(rand: () => number, spread = 0.12): number {
  return 1 + (rand() * 2 - 1) * spread;
}

const DATE_RANGE_MULTIPLIER: Record<AdDateRange, number> = {
  Today: 1 / 30,
  "Last 7 days": 7 / 30,
  "Last 30 days": 1,
  "Last 90 days": 3,
};

const LOCATION_SHARE: Record<string, number> = { "nairobi-cbd": 0.48, westlands: 0.31, "thika-road": 0.21 };

export interface AdPerformanceSnapshot {
  totalPlays: number;
  estimatedReach: number;
  completionPct: number;
  avgFrequency: number;
  estimatedRevenue: number;
  byLocation: { id: string; name: string; pct: number; plays: number }[];
  heatmap: { day: string; hour: string; intensity: 0 | 1 | 2 | 3 | 4 }[];
}

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = ["8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM", "8 PM"];
const BASE_INTENSITY: number[][] = [
  [1, 1, 1, 1, 2, 2, 1],
  [2, 2, 2, 2, 3, 3, 2],
  [3, 3, 3, 3, 3, 4, 3],
  [3, 3, 3, 4, 3, 4, 4],
  [4, 4, 4, 4, 4, 4, 4],
  [4, 4, 4, 4, 4, 4, 4],
  [3, 4, 3, 4, 4, 4, 4],
];

export function generateAdSnapshot(filters: AdFilters): AdPerformanceSnapshot {
  const rand = mulberry32(seedFromString(`${filters.dateRange}|${filters.locationId}|${filters.campaignId}|${filters.advertiser}`));

  let scopedCampaigns = CAMPAIGNS;
  if (filters.campaignId !== "all") scopedCampaigns = scopedCampaigns.filter((c) => c.id === filters.campaignId);
  if (filters.advertiser !== "All Advertisers") scopedCampaigns = scopedCampaigns.filter((c) => c.advertiser === filters.advertiser);
  if (filters.locationId !== "all") scopedCampaigns = scopedCampaigns.filter((c) => c.locationIds.includes(filters.locationId));

  const baseMultiplier = scopedCampaigns.length === 0 ? 0 : Math.max(0.15, scopedCampaigns.length / CAMPAIGNS.length);
  const dateMult = DATE_RANGE_MULTIPLIER[filters.dateRange];

  const totalPlays = Math.round(24820 * baseMultiplier * dateMult * jitter(rand, 0.1));
  const estimatedReach = Math.round(48240 * baseMultiplier * dateMult * jitter(rand, 0.1));
  const completionPct = Math.min(99, Math.round(92.4 * jitter(rand, 0.02) * 10) / 10);
  const avgFrequency = Math.round(3.2 * jitter(rand, 0.1) * 10) / 10;
  const estimatedRevenue = Math.round(184500 * baseMultiplier * dateMult * jitter(rand, 0.1));

  const byLocation = TARGET_TREE.map((loc) => {
    const pct = Math.round((LOCATION_SHARE[loc.id] ?? 0) * jitter(rand, 0.08) * 1000) / 10;
    return { id: loc.id, name: loc.name, pct, plays: Math.round(totalPlays * (pct / 100)) };
  });

  const heatmap: AdPerformanceSnapshot["heatmap"] = [];
  BASE_INTENSITY.forEach((row, hourIdx) => {
    row.forEach((base, dayIdx) => {
      const nudged = Math.max(0, Math.min(4, Math.round(base + (rand() - 0.5))));
      heatmap.push({ day: WEEK[dayIdx], hour: HOURS[hourIdx], intensity: nudged as 0 | 1 | 2 | 3 | 4 });
    });
  });

  return { totalPlays, estimatedReach, completionPct, avgFrequency, estimatedRevenue, byLocation, heatmap };
}
