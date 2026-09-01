/**
 * Deterministic, seeded mock-data generator shared by Analytics, Audience
 * Insights and Reports. Frontend-only — nothing here is real telemetry.
 * The same filter combination always produces the same numbers (stable
 * across re-renders); changing a filter produces different, but plausible
 * and proportionate, numbers — satisfying "the UI should update mock data
 * when filters change" without needing to hand-write every combination.
 *
 * Baseline figures (Last 30 days, All Locations) match the brief's own
 * worked examples exactly; other filter combinations are derived from that
 * baseline via date-range/location share multipliers plus small seeded
 * jitter, so every number stays internally proportionate.
 */
import { ANALYTICS_LOCATIONS, TOTAL_SCREENS, type AnalyticsFilters, type DateRange } from "./types";

// --- Seeded PRNG (mulberry32) --------------------------------------------
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

const DATE_RANGE_MULTIPLIER: Record<DateRange, number> = {
  Today: 1 / 30,
  Yesterday: 1 / 30,
  "Last 7 days": 7 / 30,
  "Last 30 days": 1,
  "Last 90 days": 3,
  "This month": 0.97,
  "Previous month": 1.03,
};

function locationMultiplier(locationId: string): number {
  if (locationId === "all") return 1;
  const loc = ANALYTICS_LOCATIONS.find((l) => l.id === locationId);
  return loc ? loc.screens / TOTAL_SCREENS : 1;
}

function jitter(rand: () => number, spread = 0.12): number {
  return 1 + (rand() * 2 - 1) * spread;
}

function scale(base: number, filters: AnalyticsFilters, rand: () => number, spread = 0.1): number {
  let mult = DATE_RANGE_MULTIPLIER[filters.dateRange] * locationMultiplier(filters.locationId);
  if (filters.zone !== "All Zones") mult *= 0.55;
  if (filters.room !== "All Rooms") mult *= 0.4;
  return Math.max(0, Math.round(base * mult * jitter(rand, spread)));
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

export interface TrendKpi {
  key: string;
  label: string;
  value: string;
  trendPct: number;
  sublabel: string;
}

export interface WeeklyPoint {
  label: string;
  audience: number;
  plays: number;
  engagement: number;
}

export interface ContentPerformanceRow {
  id: string;
  title: string;
  type: "Video" | "Playlist" | "Image";
  thumbnail: string | null;
  plays: number;
  reach: number;
  trendPct: number;
}

export interface LocationPerformanceRow {
  id: string;
  name: string;
  screens: number;
  uptimePct: number;
  plays: number;
  reach: number;
  adPlays: number;
}

export interface ScreenRow {
  id: string;
  name: string;
  location: string;
  uptimePct: number | null;
  status: "online" | "offline" | "attention";
}

export interface CampaignRow {
  id: string;
  name: string;
  plays: number;
  reach: number;
  completionPct: number;
}

export interface HeatmapCell {
  day: string;
  hour: string;
  intensity: 0 | 1 | 2 | 3 | 4;
}

export interface PeakHourBar {
  hour: string;
  value: number;
}

export interface NamedBar {
  id: string;
  name: string;
  value: number;
}

export interface ScreenAttentionRow {
  id: string;
  name: string;
  level: "High" | "Medium" | "Low";
}

export interface InsightCard {
  id: string;
  title: string;
  body: string;
  ctaLabel?: string;
}

export interface AnalyticsSnapshot {
  filters: AnalyticsFilters;
  kpis: TrendKpi[];
  weeklySeries: WeeklyPoint[];
  contentPerformance: ContentPerformanceRow[];
  locationPerformance: LocationPerformanceRow[];
  screens: ScreenRow[];
  screenSummary: { online: number; offline: number; attention: number; uptimePct: number };
  advertising: { adPlays: number; estimatedReach: number; activeCampaigns: number; topCampaign: string; campaigns: CampaignRow[] };
  announcements: { total: number; deliveredPct: number; pauseCount: number; reduceCount: number; byDay: { label: string; count: number }[] };
  insights: InsightCard[];

  audienceKpis: { estimatedAudience: number; peakActivityLabel: string; avgSessionMinutes: number; mostActiveLocation: string };
  heatmap: HeatmapCell[];
  peakHours: PeakHourBar[];
  peakPeriodLabel: string;
  peakLiftPct: number;
  locationAudience: NamedBar[];
  screenAttention: ScreenAttentionRow[];
  contentAudience: NamedBar[];
  audienceInsights: InsightCard[];
}

const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HEATMAP_HOURS = ["6 AM", "8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM", "8 PM"];
// Matches the brief's own hand-drawn heatmap almost verbatim: a clear lunch
// (12–2pm) peak every day, tapering off toward evening, slightly hotter on
// Fri/Sat evenings. Values are base intensities (0-4); jitter can nudge a
// cell by ±1 per filter combination without changing the overall shape.
const BASE_HEATMAP_INTENSITY: number[][] = [
  // Mon Tue Wed Thu Fri Sat Sun
  [1, 1, 1, 1, 1, 1, 1], // 6 AM
  [1, 2, 2, 2, 2, 2, 1], // 8 AM
  [2, 3, 3, 3, 3, 3, 2], // 10 AM
  [3, 4, 4, 4, 4, 4, 3], // 12 PM
  [4, 4, 4, 4, 4, 4, 4], // 2 PM
  [3, 3, 3, 3, 4, 4, 3], // 4 PM
  [2, 3, 3, 3, 4, 4, 4], // 6 PM
  [2, 2, 2, 2, 3, 4, 4], // 8 PM
];

const CONTENT_BASE: Omit<ContentPerformanceRow, "plays" | "reach" | "trendPct"> = {
  id: "content-happy-hour",
  title: "Happy Hour Promotion",
  type: "Video",
  thumbnail: "https://images.pexels.com/photos/4762719/pexels-photo-4762719.jpeg?auto=compress&cs=tinysrgb&w=400",
};

export function generateAnalyticsSnapshot(filters: AnalyticsFilters): AnalyticsSnapshot {
  const seedKey = `${filters.dateRange}|${filters.locationId}|${filters.zone}|${filters.room}|${filters.compare}`;
  const rand = mulberry32(seedFromString(seedKey));

  const kpiBase = [
    { key: "reach", label: "Estimated Reach", base: 1284, trendBase: 18.4, sublabel: "vs previous period" },
    { key: "plays", label: "Content Plays", base: 18492, trendBase: 12.7, sublabel: "vs previous period" },
    { key: "uptime", label: "Screen Uptime", base: 98.7, trendBase: 1.2, sublabel: "vs previous period", isPct: true },
    { key: "ads", label: "Ad Plays", base: 6420, trendBase: 24.8, sublabel: "vs previous period" },
    { key: "announcements", label: "Announcements", base: 126, trendBase: 8.3, sublabel: "vs previous period" },
  ];

  const kpis: TrendKpi[] = kpiBase.map((k) => {
    const trendPct = Math.round((k.trendBase * jitter(rand, 0.3)) * 10) / 10;
    if (k.isPct) {
      const value = Math.min(99.9, k.base * jitter(rand, 0.01));
      return { key: k.key, label: k.label, value: pct(value), trendPct, sublabel: k.sublabel };
    }
    const value = scale(k.base, filters, rand, 0.15);
    return { key: k.key, label: k.label, value: value.toLocaleString(), trendPct, sublabel: k.sublabel };
  });

  const totalPlays = Number(kpis.find((k) => k.key === "plays")?.value.replace(/,/g, "")) || 18492;
  const totalReach = Number(kpis.find((k) => k.key === "reach")?.value.replace(/,/g, "")) || 1284;
  const totalAdPlays = Number(kpis.find((k) => k.key === "ads")?.value.replace(/,/g, "")) || 6420;
  const totalAnnouncements = Number(kpis.find((k) => k.key === "announcements")?.value.replace(/,/g, "")) || 126;

  const weeklySeries: WeeklyPoint[] = WEEK_LABELS.map((label, i) => {
    const dayFactor = 0.7 + Math.sin((i / 6) * Math.PI) * 0.5;
    return {
      label,
      audience: Math.round((totalReach / 7) * dayFactor * jitter(rand, 0.15)),
      plays: Math.round((totalPlays / 7) * dayFactor * jitter(rand, 0.15)),
      engagement: Math.round(40 + dayFactor * 45 * jitter(rand, 0.1)),
    };
  });

  const contentSpecs = [
    { title: "Happy Hour Promotion", type: "Video" as const, thumbnail: CONTENT_BASE.thumbnail, plays: 842, reach: 2430, trendPct: 24 },
    { title: "Weekend Playlist", type: "Playlist" as const, thumbnail: null, plays: 624, reach: 1920, trendPct: 18 },
    { title: "Lunch Specials", type: "Video" as const, thumbnail: "https://images.pexels.com/photos/15010311/pexels-photo-15010311.jpeg?auto=compress&cs=tinysrgb&w=400", plays: 518, reach: 1740, trendPct: 12 },
    { title: "Brand Video", type: "Video" as const, thumbnail: null, plays: 402, reach: 1280, trendPct: -4 },
    { title: "Rooftop Ambience", type: "Playlist" as const, thumbnail: null, plays: 318, reach: 960, trendPct: 9 },
    { title: "New Menu Launch", type: "Image" as const, thumbnail: null, plays: 240, reach: 740, trendPct: 6 },
  ];
  const contentPerformance: ContentPerformanceRow[] = contentSpecs.map((c, i) => ({
    id: `content-${i}`,
    title: c.title,
    type: c.type,
    thumbnail: c.thumbnail,
    plays: scale(c.plays, filters, rand, 0.1),
    reach: scale(c.reach, filters, rand, 0.1),
    trendPct: Math.round(c.trendPct * jitter(rand, 0.2)),
  }));

  const locationPerformance: LocationPerformanceRow[] = ANALYTICS_LOCATIONS.map((loc, i) => {
    const uptimeBase = [98.9, 97.8, 99.2][i] ?? 98;
    const share = loc.screens / TOTAL_SCREENS;
    return {
      id: loc.id,
      name: loc.name,
      screens: loc.screens,
      uptimePct: Math.round(uptimeBase * jitter(rand, 0.005) * 10) / 10,
      plays: Math.round(totalPlays * share * jitter(rand, 0.1)),
      reach: Math.round(totalReach * share * jitter(rand, 0.1)),
      adPlays: Math.round(totalAdPlays * share * jitter(rand, 0.1)),
    };
  });

  const screens: ScreenRow[] = [];
  let screenCounter = 1;
  for (const loc of ANALYTICS_LOCATIONS) {
    for (let i = 0; i < loc.screens; i++) {
      const idx = screenCounter;
      const isAttention = idx === 3;
      const isOffline = idx === TOTAL_SCREENS;
      screens.push({
        id: `screen-${idx}`,
        name: `TV ${String(idx).padStart(2, "0")}`,
        location: loc.name,
        uptimePct: isOffline ? null : Math.round((isAttention ? 91.4 : 96 + rand() * 3.5) * 10) / 10,
        status: isOffline ? "offline" : isAttention ? "attention" : "online",
      });
      screenCounter++;
    }
  }
  const screenSummary = {
    online: screens.filter((s) => s.status === "online").length,
    offline: screens.filter((s) => s.status === "offline").length,
    attention: screens.filter((s) => s.status === "attention").length,
    uptimePct: Math.round((screens.reduce((sum, s) => sum + (s.uptimePct ?? 0), 0) / screens.length) * 10) / 10,
  };

  const campaignSpecs = [
    { name: "Happy Hour", plays: 2420, reach: 4820, completionPct: 94 },
    { name: "Weekend Special", plays: 1840, reach: 3620, completionPct: 91 },
    { name: "Rooftop Event", plays: 1240, reach: 2480, completionPct: 90 },
    { name: "Lunch Promo", plays: 920, reach: 2140, completionPct: 88 },
  ];
  const campaigns: CampaignRow[] = campaignSpecs.map((c, i) => ({
    id: `campaign-${i}`,
    name: c.name,
    plays: scale(c.plays, filters, rand, 0.1),
    reach: scale(c.reach, filters, rand, 0.1),
    completionPct: Math.min(99, Math.round(c.completionPct * jitter(rand, 0.02))),
  }));

  const pauseCount = Math.round(totalAnnouncements * 0.57);
  const announcements = {
    total: totalAnnouncements,
    deliveredPct: 98,
    pauseCount,
    reduceCount: totalAnnouncements - pauseCount,
    byDay: WEEK_LABELS.map((label) => ({ label, count: Math.max(1, Math.round((totalAnnouncements / 7) * jitter(rand, 0.3))) })),
  };

  const insights: InsightCard[] = [
    {
      id: "insight-lunch",
      title: "Tazama Insight",
      body: "Your Main Hall receives the highest audience activity between 12 PM and 2 PM. Consider scheduling lunch promotions during this period.",
      ctaLabel: "Create Schedule",
    },
    {
      id: "insight-happy-hour",
      title: "Tazama Insight",
      body: `Your Happy Hour promotion is receiving ${contentPerformance[0].trendPct}% more plays than the previous period.`,
      ctaLabel: "View Content",
    },
    {
      id: "insight-tv03",
      title: "Tazama Insight",
      body: "TV 03 has experienced lower uptime than other screens this week.",
      ctaLabel: "View Device",
    },
  ];

  // --- Audience Insights -------------------------------------------------
  const estimatedAudience = scale(12840, filters, rand, 0.12);
  const audienceKpis = {
    estimatedAudience,
    peakActivityLabel: "1:00 PM",
    avgSessionMinutes: Math.round(18 * jitter(rand, 0.15)),
    mostActiveLocation: locationPerformance.reduce((a, b) => (b.reach > a.reach ? b : a)).name,
  };

  const heatmap: HeatmapCell[] = [];
  BASE_HEATMAP_INTENSITY.forEach((row, hourIdx) => {
    row.forEach((base, dayIdx) => {
      const nudged = Math.max(0, Math.min(4, Math.round(base + (rand() - 0.5))));
      heatmap.push({ day: WEEK_LABELS[dayIdx], hour: HEATMAP_HOURS[hourIdx], intensity: nudged as HeatmapCell["intensity"] });
    });
  });

  // Separate hour-of-day profile (aggregated across the period, not a
  // per-weekday slice) — deliberately peaks in the evening per the brief's
  // own Peak Hours example, a different (also valid) lens from the lunch
  // -heavy day×hour heatmap above.
  const peakHourSpecs = [
    { hour: "12 PM", value: 62 },
    { hour: "1 PM", value: 68 },
    { hour: "2 PM", value: 61 },
    { hour: "3 PM", value: 48 },
    { hour: "4 PM", value: 55 },
    { hour: "5 PM", value: 63 },
    { hour: "6 PM", value: 78 },
    { hour: "7 PM", value: 82 },
    { hour: "8 PM", value: 70 },
  ];
  const peakHours: PeakHourBar[] = peakHourSpecs.map((p) => ({ hour: p.hour, value: Math.round(p.value * jitter(rand, 0.08)) }));

  const locationAudience: NamedBar[] = locationPerformance
    .map((l) => ({ id: l.id, name: l.name, value: l.reach }))
    .sort((a, b) => b.value - a.value);

  const screenAttention: ScreenAttentionRow[] = [
    { id: "att-1", name: "Main Hall TV 01", level: "High" as const },
    { id: "att-2", name: "Main Hall TV 02", level: "High" as const },
    { id: "att-3", name: "Bar TV 01", level: "Medium" as const },
    { id: "att-4", name: "Rooftop TV 01", level: "Low" as const },
  ];

  const contentAudience: NamedBar[] = contentPerformance
    .slice(0, 4)
    .map((c) => ({ id: c.id, name: c.title, value: c.reach }))
    .sort((a, b) => b.value - a.value);

  const audienceInsights: InsightCard[] = [
    {
      id: "aud-peak-window",
      title: "Peak Window",
      body: "6 PM – 8 PM. Audience activity is approximately 32% higher than your daily average.",
    },
    {
      id: "aud-best-location",
      title: "Best Location",
      body: `${audienceKpis.mostActiveLocation}. Highest estimated audience activity this month.`,
    },
    {
      id: "aud-content-opportunity",
      title: "Content Opportunity",
      body: "Lunch Specials. Consider increasing exposure between 12 PM and 2 PM.",
    },
  ];

  return {
    filters,
    kpis,
    weeklySeries,
    contentPerformance,
    locationPerformance,
    screens,
    screenSummary,
    advertising: {
      adPlays: totalAdPlays,
      estimatedReach: estimatedAudience,
      activeCampaigns: 8,
      topCampaign: campaigns[0].name,
      campaigns,
    },
    announcements,
    insights,
    audienceKpis,
    heatmap,
    peakHours,
    peakPeriodLabel: "6:00 PM – 8:00 PM",
    peakLiftPct: 32,
    locationAudience,
    screenAttention,
    contentAudience,
    audienceInsights,
  };
}
