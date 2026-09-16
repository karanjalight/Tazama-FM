/**
 * Real advertising analytics — plays are counted from real play events, and
 * views/reach/revenue are estimated from them (lib/business/ad-estimates.ts).
 * SERVER ONLY. Every function degrades to empty results (never throws) when
 * supabase/business-ad-serving.sql hasn't been applied.
 */
import { AD_STALE_GRACE_MS, localDateParts, parseFrequencyMinutes, startOfLocalDayMs } from "@/lib/business/ad-scheduling";
import {
  applyBudgetCaps,
  effectiveCpm,
  estimateAiringInRoom,
  type AudienceEstimate,
  type BudgetRule,
} from "@/lib/business/ad-estimates";
import { addDaysIso } from "@/lib/business/ad-inventory";
import { loadAdContext, type AdContext } from "@/lib/business/ad-context";
import type { AdContentType, AdSourceKind } from "@/lib/business/ad-types";
import type { BusinessViewer } from "@/lib/business/types";
import { campaignDisplayStatus } from "@/lib/business/campaign-types";

export * from "@/lib/business/ad-analytics-types";
import {
  emptyTotals,
  resolveAdWindow,
  type AdAnalytics,
  type AdAnalyticsFilters,
  type AdBreakdownRow,
  type AdCampaignStats,
  type AdInsight,
  type AdMetricTotals,
} from "@/lib/business/ad-analytics-types";

// ── Internals ────────────────────────────────────────────────────────────

interface RollupRow {
  ad_break_id: string;
  campaign_id: string | null;
  started_at: string;
  room_id: string | null;
  device_ids: string[] | null;
  impressions: number;
  completed: number;
}

/** One airing × room, with its estimate already budget-capped. */
interface ScoredRow {
  breakId: string;
  campaignId: string;
  roomId: string;
  startedAtMs: number;
  dayKey: string;
  weekday: number;
  hour: number;
  plays: number;
  completed: number;
  deviceIds: string[];
  estimate: AudienceEstimate;
}

async function fetchRollup(ctx: AdContext, fromIso: string, toIso: string): Promise<RollupRow[]> {
  const rows: RollupRow[] = [];
  const pageSize = 1000;
  for (let offset = 0; offset < 200_000; offset += pageSize) {
    const { data, error } = await ctx.admin
      .rpc("ad_impression_rollup", { p_business: ctx.businessId, p_from: fromIso, p_to: toIso })
      .range(offset, offset + pageSize - 1);
    if (error) {
      console.error("ad analytics: rollup failed", error);
      break;
    }
    const page = (data ?? []) as RollupRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

function addTotals(into: AdMetricTotals, row: ScoredRow, countAiring: boolean): void {
  into.plays += row.plays;
  into.completed += row.completed;
  if (countAiring) into.airings += 1;
  into.views += row.estimate.views;
  into.reach += row.estimate.reach;
  into.revenue += row.estimate.revenue;
}

function finalize<T extends AdMetricTotals>(t: T): T {
  t.completionPct = t.plays ? Math.round((t.completed / t.plays) * 100) : 0;
  return t;
}

function sumTotals(rows: ScoredRow[]): AdMetricTotals {
  const t = emptyTotals();
  const seen = new Set<string>();
  for (const row of rows) {
    addTotals(t, row, !seen.has(row.breakId));
    seen.add(row.breakId);
  }
  return finalize(t);
}

/** Scores every play in [fromMs, now) — with budget caps computed over the
 * campaign's whole lifetime so a total budget spent last month still caps
 * this month. */
async function scoreRows(ctx: AdContext, fromMs: number, now: Date, filters: AdAnalyticsFilters): Promise<ScoredRow[]> {
  if (!ctx.schemaReady || !ctx.campaigns.length) return [];

  const earliestCampaign = Math.min(...ctx.campaigns.map((c) => Date.parse(c.createdAt)));
  const lifetimeFloor = now.getTime() - 400 * 86_400_000;
  const fetchFrom = Math.max(lifetimeFloor, Math.min(fromMs, Number.isFinite(earliestCampaign) ? earliestCampaign : fromMs));
  const rollup = await fetchRollup(ctx, new Date(fetchFrom).toISOString(), now.toISOString());

  const scored: ScoredRow[] = [];
  for (const row of rollup) {
    if (!row.campaign_id || !row.room_id) continue;
    const campaign = ctx.campaignById.get(row.campaign_id);
    const room = ctx.roomById.get(row.room_id);
    if (!campaign || !room || !room.branchId) continue; // outside this viewer's locations

    const startedAt = new Date(row.started_at);
    const branch = ctx.branchById.get(room.branchId);
    const roomLocal = localDateParts(branch?.timezone ?? ctx.timezone, startedAt);
    const businessLocal = localDateParts(ctx.timezone, startedAt);
    const deviceIds = row.device_ids ?? [];
    const cpms = deviceIds.map((id) => effectiveCpm(ctx.screenById.get(id)?.cpm));
    const unpaired = Math.max(0, row.impressions - deviceIds.length);
    for (let i = 0; i < unpaired; i++) cpms.push(effectiveCpm(null));

    scored.push({
      breakId: row.ad_break_id,
      campaignId: campaign.id,
      roomId: room.id,
      startedAtMs: startedAt.getTime(),
      dayKey: businessLocal.isoDate,
      weekday: businessLocal.weekday,
      hour: businessLocal.hour,
      plays: row.impressions,
      completed: row.completed,
      deviceIds,
      estimate: estimateAiringInRoom({
        room: { capacity: room.capacity, roomType: room.roomType, pairedScreens: ctx.screensByRoom.get(room.id)?.length ?? 0 },
        hour: roomLocal.hour,
        weekday: roomLocal.weekday,
        screensShown: row.impressions,
        frequencyMinutes: parseFrequencyMinutes(campaign.frequencyMinutes),
        cpm: cpms.length ? cpms.reduce((a, b) => a + b, 0) / cpms.length : null,
      }),
    });
  }

  // Budget caps per campaign per day, spread back proportionally onto rows.
  const budgets = new Map<string, BudgetRule>(ctx.campaigns.map((c) => [c.id, { type: c.budgetType, amount: c.budgetAmount }]));
  const rawByKey = new Map<string, number>();
  for (const r of scored) {
    const key = `${r.campaignId}|${r.dayKey}`;
    rawByKey.set(key, (rawByKey.get(key) ?? 0) + r.estimate.revenue);
  }
  const capped = applyBudgetCaps(
    [...rawByKey].map(([key, revenue]) => {
      const [campaignId, dayKey] = key.split("|");
      return { campaignId, dayKey, revenue };
    }),
    budgets,
  );
  for (const r of scored) {
    const key = `${r.campaignId}|${r.dayKey}`;
    const raw = rawByKey.get(key) ?? 0;
    const factor = raw > 0 ? (capped.get(key) ?? raw) / raw : 1;
    r.estimate = { ...r.estimate, revenue: r.estimate.revenue * factor };
  }

  return scored.filter((r) => {
    if (filters.campaignId && r.campaignId !== filters.campaignId) return false;
    if (filters.locationId && ctx.roomById.get(r.roomId)?.branchId !== filters.locationId) return false;
    if (filters.advertiser && (ctx.campaignById.get(r.campaignId)?.advertiserName ?? "") !== filters.advertiser) return false;
    return true;
  });
}

function groupRows(
  rows: ScoredRow[],
  keyOf: (r: ScoredRow) => string | null,
  labelOf: (key: string) => { name: string; context: string | null },
): AdBreakdownRow[] {
  const groups = new Map<string, { totals: AdMetricTotals; breaks: Set<string> }>();
  for (const r of rows) {
    const key = keyOf(r);
    if (!key) continue;
    const g = groups.get(key) ?? { totals: emptyTotals(), breaks: new Set<string>() };
    addTotals(g.totals, r, !g.breaks.has(r.breakId));
    g.breaks.add(r.breakId);
    groups.set(key, g);
  }
  return [...groups]
    .map(([id, g]) => ({ id, ...labelOf(id), ...finalize(g.totals) }))
    .sort((a, b) => b.plays - a.plays || b.views - a.views);
}

/** Per-screen rows: each paired screen gets an equal share of its room row's
 * estimate; plays the room row counted from unpaired players are grouped as
 * "Unpaired players" for that room. */
function screenBreakdown(ctx: AdContext, rows: ScoredRow[]): AdBreakdownRow[] {
  const groups = new Map<string, { totals: AdMetricTotals; breaks: Set<string> }>();
  const add = (key: string, r: ScoredRow, plays: number, completed: number) => {
    const share = r.plays > 0 ? plays / r.plays : 0;
    const g = groups.get(key) ?? { totals: emptyTotals(), breaks: new Set<string>() };
    g.totals.plays += plays;
    g.totals.completed += completed;
    if (!g.breaks.has(r.breakId)) g.totals.airings += 1;
    g.breaks.add(r.breakId);
    g.totals.views += r.estimate.views * share;
    g.totals.reach += r.estimate.reach * share;
    g.totals.revenue += r.estimate.revenue * share;
    groups.set(key, g);
  };
  for (const r of rows) {
    const completedRate = r.plays > 0 ? r.completed / r.plays : 0;
    for (const deviceId of r.deviceIds) add(deviceId, r, 1, completedRate);
    const unpaired = r.plays - r.deviceIds.length;
    if (unpaired > 0) add(`unpaired:${r.roomId}`, r, unpaired, completedRate * unpaired);
  }
  return [...groups]
    .map(([id, g]) => {
      const t = finalize(g.totals);
      t.completed = Math.round(t.completed);
      if (id.startsWith("unpaired:")) {
        const room = ctx.roomById.get(id.slice("unpaired:".length));
        return { id, name: "Unpaired players", context: room?.name ?? null, ...t };
      }
      const screen = ctx.screenById.get(id);
      const room = screen?.roomId ? ctx.roomById.get(screen.roomId) : undefined;
      const branch = screen ? ctx.branchById.get(screen.branchId) : undefined;
      return {
        id,
        name: screen?.name ?? "Removed screen",
        context: [branch?.name, room?.name].filter(Boolean).join(" · ") || null,
        ...t,
      };
    })
    .sort((a, b) => b.plays - a.plays || b.views - a.views);
}

const HOUR_LABEL = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;

function buildInsights(ctx: AdContext, totals: AdMetricTotals, previous: AdMetricTotals, rows: ScoredRow[], byRoom: AdBreakdownRow[], byCampaign: Record<string, AdCampaignStats>): AdInsight[] {
  if (!totals.plays) return [];
  const insights: AdInsight[] = [];

  const byHour = new Array(24).fill(0) as number[];
  for (const r of rows) byHour[r.hour] += r.estimate.views;
  const peakHour = byHour.indexOf(Math.max(...byHour));
  const peakShare = totals.views > 0 ? Math.round((byHour[peakHour] / totals.views) * 100) : 0;
  insights.push({
    id: "peak-hour",
    title: "Peak ad hour",
    body: `${HOUR_LABEL(peakHour)}–${HOUR_LABEL((peakHour + 1) % 24)} delivers the most estimated views (${peakShare}% of the period). Weight high-value campaigns toward it.`,
  });

  const topRoom = [...byRoom].sort((a, b) => b.views - a.views)[0];
  if (topRoom) {
    insights.push({
      id: "top-room",
      title: "Strongest room",
      body: `${topRoom.name}${topRoom.context ? ` (${topRoom.context})` : ""} earned an estimated ${Math.round(topRoom.views).toLocaleString()} views from ${topRoom.plays.toLocaleString()} plays.`,
    });
  }

  const campaigns = Object.values(byCampaign).filter((c) => c.plays >= 5);
  const best = campaigns.sort((a, b) => b.completionPct - a.completionPct)[0];
  if (best) {
    const name = ctx.campaignById.get(best.campaignId)?.name ?? "A campaign";
    insights.push({
      id: "best-completion",
      title: "Best completion",
      body: `${name} plays to the end ${best.completionPct}% of the time across ${best.plays.toLocaleString()} plays.`,
    });
  }

  if (previous.plays > 0) {
    const change = Math.round(((totals.plays - previous.plays) / previous.plays) * 100);
    insights.push({
      id: "trend",
      title: change >= 0 ? "Plays are up" : "Plays are down",
      body: `${Math.abs(change)}% ${change >= 0 ? "more" : "fewer"} ad plays than the previous period (${previous.plays.toLocaleString()} → ${totals.plays.toLocaleString()}).`,
    });
  }
  return insights;
}

// ── Public reads ─────────────────────────────────────────────────────────

export async function getAdAnalytics(viewer: BusinessViewer, filters: AdAnalyticsFilters, now: Date = new Date()): Promise<AdAnalytics> {
  return computeAdAnalytics(await loadAdContext(viewer), filters, now);
}

export async function computeAdAnalytics(ctx: AdContext | null, filters: AdAnalyticsFilters, now: Date = new Date()): Promise<AdAnalytics> {
  const DAY = 86_400_000;
  const tz = ctx?.timezone ?? "Africa/Nairobi";
  const todayIso = localDateParts(tz, now).isoDate;
  const { fromDate, toDate, days } = resolveAdWindow(filters.range, todayIso);
  const todayStart = startOfLocalDayMs(tz, now);
  const dayOffset = (iso: string) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${todayIso}T00:00:00Z`)) / DAY);
  const fromMs = todayStart + dayOffset(fromDate) * DAY;
  const toMs = todayStart + (dayOffset(toDate) + 1) * DAY;
  const prevFromMs = fromMs - days * DAY;

  const dailyDates = Array.from({ length: days }, (_, i) => addDaysIso(fromDate, i));
  const base: AdAnalytics = {
    schemaReady: ctx?.schemaReady ?? false,
    range: filters.range,
    fromDate,
    toDate,
    totals: emptyTotals(),
    previous: emptyTotals(),
    daily: dailyDates.map((date) => ({ date, plays: 0, views: 0, reach: 0, revenue: 0 })),
    byCampaign: {},
    byLocation: [],
    byRoom: [],
    byScreen: [],
    heatmap: [],
    insights: [],
    advertisers: [],
    campaigns: [],
  };
  if (!ctx) return base;
  base.campaigns = ctx.campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    advertiser: c.advertiserName,
    status: campaignDisplayStatus(c, todayIso),
  }));
  base.advertisers = [...new Set(ctx.campaigns.map((c) => c.advertiserName).filter((a): a is string => !!a))].sort();

  const all = await scoreRows(ctx, prevFromMs, now, filters);
  const current = all.filter((r) => r.startedAtMs >= fromMs && r.startedAtMs < toMs);
  const previous = all.filter((r) => r.startedAtMs >= prevFromMs && r.startedAtMs < fromMs);

  base.totals = sumTotals(current);
  base.previous = sumTotals(previous);

  const dailyIndex = new Map(base.daily.map((d, i) => [d.date, i]));
  for (const r of current) {
    const point = base.daily[dailyIndex.get(r.dayKey) ?? -1];
    if (!point) continue;
    point.plays += r.plays;
    point.views += r.estimate.views;
    point.reach += r.estimate.reach;
    point.revenue += r.estimate.revenue;
  }

  // Campaign stats always include plays today, even for a short range.
  for (const campaign of ctx.campaigns) {
    base.byCampaign[campaign.id] = { campaignId: campaign.id, playsToday: 0, ...emptyTotals() };
  }
  const seenBreaks = new Set<string>();
  for (const r of current) {
    const stats = base.byCampaign[r.campaignId];
    if (!stats) continue;
    addTotals(stats, r, !seenBreaks.has(r.breakId));
    seenBreaks.add(r.breakId);
  }
  for (const r of all) {
    if (r.startedAtMs >= todayStart && base.byCampaign[r.campaignId]) base.byCampaign[r.campaignId].playsToday += r.plays;
  }
  for (const stats of Object.values(base.byCampaign)) finalize(stats);

  base.byLocation = groupRows(
    current,
    (r) => ctx.roomById.get(r.roomId)?.branchId ?? null,
    (id) => ({ name: ctx.branchById.get(id)?.name ?? "Location", context: ctx.branchById.get(id)?.city ?? null }),
  );
  base.byRoom = groupRows(
    current,
    (r) => r.roomId,
    (id) => {
      const room = ctx.roomById.get(id);
      const branch = room?.branchId ? ctx.branchById.get(room.branchId) : undefined;
      const zone = room?.zoneId ? ctx.zoneById.get(room.zoneId) : undefined;
      return { name: room?.name ?? "Room", context: [branch?.name, zone?.name].filter(Boolean).join(" · ") || null };
    },
  );
  base.byScreen = screenBreakdown(ctx, current);

  const heat = new Map<string, number>();
  for (const r of current) heat.set(`${r.weekday}|${r.hour}`, (heat.get(`${r.weekday}|${r.hour}`) ?? 0) + r.plays);
  base.heatmap = [...heat].map(([key, plays]) => {
    const [weekday, hour] = key.split("|").map(Number);
    return { weekday, hour, plays };
  });

  base.insights = buildInsights(ctx, base.totals, base.previous, current, base.byRoom, base.byCampaign);
  return base;
}

// ── Live status (polled every ~10s by the dashboard) ─────────────────────

export interface LiveAdAiring {
  breakId: string;
  campaignId: string | null;
  campaignName: string;
  advertiser: string | null;
  creativeTitle: string;
  contentType: AdContentType | null;
  startedAt: string;
  endsAt: string;
  /** Where it's airing, e.g. "Main Hall, Bar Area" or "Zone: Level 28". */
  placeLabel: string;
  screenCount: number;
  pausesMusic: boolean;
}

export interface LiveAdStatus {
  schemaReady: boolean;
  generatedAt: string;
  onAir: LiveAdAiring[];
  playsToday: Record<string, number>;
  totalPlaysToday: number;
  airingsToday: number;
}

interface OpenBreakRow {
  id: string;
  campaign_id: string | null;
  content_item_id: string | null;
  source_kind: AdSourceKind;
  source_id: string;
  room_ids: string[] | null;
  screen_ids: string[] | null;
  pauses_music: boolean;
  started_at: string;
  ends_at: string;
}

export async function getLiveAdStatus(viewer: BusinessViewer, now: Date = new Date()): Promise<LiveAdStatus> {
  return computeLiveAdStatus(await loadAdContext(viewer), now);
}

export async function computeLiveAdStatus(ctx: AdContext | null, now: Date = new Date()): Promise<LiveAdStatus> {
  const empty: LiveAdStatus = {
    schemaReady: false,
    generatedAt: now.toISOString(),
    onAir: [],
    playsToday: {},
    totalPlaysToday: 0,
    airingsToday: 0,
  };
  if (!ctx || !ctx.schemaReady) return { ...empty, schemaReady: !!ctx?.schemaReady };

  const dayStartIso = new Date(startOfLocalDayMs(ctx.timezone, now)).toISOString();
  const graceIso = new Date(now.getTime() - AD_STALE_GRACE_MS).toISOString();

  const [openRes, todayBreaksRes] = await Promise.all([
    ctx.admin
      .from("ad_breaks")
      .select("id, campaign_id, content_item_id, source_kind, source_id, room_ids, screen_ids, pauses_music, started_at, ends_at")
      .eq("business_id", ctx.businessId)
      .is("ended_at", null)
      .gt("ends_at", graceIso)
      .order("started_at", { ascending: false })
      .limit(50),
    ctx.admin
      .from("ad_breaks")
      .select("id", { count: "exact", head: true })
      .eq("business_id", ctx.businessId)
      .gte("started_at", dayStartIso),
  ]);

  const playsToday: Record<string, number> = {};
  let totalPlaysToday = 0;
  for (let offset = 0; offset < 50_000; offset += 1000) {
    const { data, error } = await ctx.admin
      .from("content_play_events")
      .select("campaign_id, room_id")
      .eq("business_id", ctx.businessId)
      .eq("play_kind", "ad")
      .not("ad_break_id", "is", null)
      .gte("started_at", dayStartIso)
      .range(offset, offset + 999);
    if (error) break;
    const page = (data ?? []) as { campaign_id: string | null; room_id: string | null }[];
    for (const row of page) {
      if (row.room_id && !ctx.roomById.has(row.room_id)) continue;
      totalPlaysToday += 1;
      if (row.campaign_id) playsToday[row.campaign_id] = (playsToday[row.campaign_id] ?? 0) + 1;
    }
    if (page.length < 1000) break;
  }

  const open = (openRes.data ?? []) as OpenBreakRow[];
  const creativeIds = [...new Set(open.map((b) => b.content_item_id).filter((id): id is string => !!id))];
  const zoneIds = open.filter((b) => b.source_kind === "zone").map((b) => b.source_id);
  const scheduleIds = open.filter((b) => b.source_kind === "schedule").map((b) => b.source_id);
  const [creativesRes, zonesRes, schedulesRes] = await Promise.all([
    creativeIds.length
      ? ctx.admin.from("content_items").select("id, title, content_type").in("id", creativeIds)
      : Promise.resolve({ data: [] }),
    zoneIds.length ? ctx.admin.from("audio_zones").select("id, name").in("id", zoneIds) : Promise.resolve({ data: [] }),
    scheduleIds.length ? ctx.admin.from("schedules").select("id, name").in("id", scheduleIds) : Promise.resolve({ data: [] }),
  ]);
  const creatives = new Map(((creativesRes.data ?? []) as { id: string; title: string; content_type: AdContentType }[]).map((c) => [c.id, c]));
  const sourceNames = new Map<string, string>([
    ...((zonesRes.data ?? []) as { id: string; name: string }[]).map((z) => [z.id, `Zone: ${z.name}`] as [string, string]),
    ...((schedulesRes.data ?? []) as { id: string; name: string }[]).map((s) => [s.id, `Schedule: ${s.name}`] as [string, string]),
  ]);

  const onAir: LiveAdAiring[] = open
    .filter((b) => {
      // Manager scope: only airings touching rooms this viewer can see.
      if (b.source_kind === "room") return ctx.roomById.has(b.source_id);
      return (b.room_ids ?? []).length === 0 || (b.room_ids ?? []).some((id) => ctx.roomById.has(id));
    })
    .map((b) => {
      const campaign = b.campaign_id ? ctx.campaignById.get(b.campaign_id) : undefined;
      const creative = b.content_item_id ? creatives.get(b.content_item_id) : undefined;
      const screenIds = b.screen_ids ?? [];
      let placeLabel: string;
      let screenCount: number;
      if (b.room_ids === null) {
        placeLabel = b.source_kind === "room" ? (ctx.roomById.get(b.source_id)?.name ?? "Room") : (sourceNames.get(b.source_id) ?? "All following rooms");
        const roomScreens = b.source_kind === "room" ? (ctx.screensByRoom.get(b.source_id)?.length ?? 0) : 0;
        screenCount = roomScreens;
      } else {
        const roomNames = b.room_ids.map((id) => ctx.roomById.get(id)?.name).filter((n): n is string => !!n);
        placeLabel = [...roomNames, screenIds.length ? `${screenIds.length} screen${screenIds.length === 1 ? "" : "s"}` : null]
          .filter(Boolean)
          .join(", ") || "Selected screens";
        screenCount = b.room_ids.reduce((sum, id) => sum + (ctx.screensByRoom.get(id)?.length ?? 0), 0) + screenIds.length;
      }
      return {
        breakId: b.id,
        campaignId: b.campaign_id,
        campaignName: campaign?.name ?? "Campaign",
        advertiser: campaign?.advertiserName ?? null,
        creativeTitle: creative?.title ?? "Creative",
        contentType: creative?.content_type ?? null,
        startedAt: b.started_at,
        endsAt: b.ends_at,
        placeLabel,
        screenCount,
        pausesMusic: b.pauses_music,
      };
    });

  return {
    schemaReady: true,
    generatedAt: now.toISOString(),
    onAir,
    playsToday,
    totalPlaysToday,
    airingsToday: todayBreaksRes.count ?? 0,
  };
}
