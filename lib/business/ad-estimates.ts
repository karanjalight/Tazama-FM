/**
 * Audience and revenue estimates for ad airings — pure, client-safe, and
 * unit-tested (ad-estimates.test.ts). Plays are real counts; everything here
 * turns a real play into an ESTIMATE of views, unique reach and revenue from
 * the room it aired in:
 *
 *   views   = capacity × occupancy(hour, weekday) × attention × screen share
 *   reach   = views ÷ how many times one visitor sees it during their stay
 *   revenue = views ÷ 1,000 × CPM, capped by the campaign budget
 *
 * The constants are shown to users verbatim via ESTIMATE_ASSUMPTIONS, so a
 * change here is a change to what the product promises.
 */
import { normalizeTime, timeToMinutes } from "./ad-scheduling";

/** Share of people present who actually notice a full-screen ad. */
export const AD_ATTENTION_RATE = 0.65;
/** Used when a room has no capacity set. */
export const DEFAULT_ROOM_CAPACITY = 40;
/** KES per 1,000 estimated views when a screen has no CPM of its own. */
export const DEFAULT_AD_CPM_KES = 400;
/** Daily window assumed for projections when a campaign has no active hours. */
export const DEFAULT_VENUE_START = "08:00";
export const DEFAULT_VENUE_END = "23:00";

/** Share of capacity occupied, by local hour — a hospitality-shaped day with
 * a lunch peak and a bigger evening peak. */
const OCCUPANCY_BY_HOUR = [
  0.06, 0.04, 0.03, 0.02, 0.02, 0.03, 0.06, 0.12, 0.2, 0.26, 0.32, 0.44, 0.62, 0.66, 0.5, 0.38, 0.42, 0.56, 0.72,
  0.8, 0.78, 0.66, 0.46, 0.24,
];
/** Monday … Sunday demand multiplier. */
const WEEKDAY_FACTOR = [0.85, 0.85, 0.9, 0.95, 1.15, 1.2, 1.0];
const MAX_OCCUPANCY = 0.95;

const DWELL_MINUTES: [needle: string, minutes: number][] = [
  ["private", 120],
  ["bar", 90],
  ["lounge", 90],
  ["club", 120],
  ["dining", 75],
  ["restaurant", 75],
  ["cafe", 45],
  ["gym", 70],
  ["reception", 20],
  ["lobby", 20],
  ["waiting", 30],
  ["retail", 25],
  ["shop", 25],
  ["outdoor", 60],
  ["terrace", 75],
];
const DEFAULT_DWELL_MINUTES = 60;

export const ESTIMATE_ASSUMPTIONS = [
  { label: "Views", detail: `Room capacity × how full the room is at that hour and weekday × ${Math.round(AD_ATTENTION_RATE * 100)}% who notice the ad × the share of the room's screens that showed it.` },
  { label: "Reach", detail: "Views ÷ how many times one visitor sees the ad during a typical stay (stay length by room type ÷ the campaign's frequency)." },
  { label: "Revenue", detail: `Views ÷ 1,000 × the screen's CPM (KES ${DEFAULT_AD_CPM_KES} when not set), capped at the campaign's daily or total budget.` },
  { label: "Defaults", detail: `Rooms without a capacity count as ${DEFAULT_ROOM_CAPACITY} people. Plays are real counts from your screens; views, reach and revenue are estimates.` },
] as const;

export function occupancyAt(hour: number, weekday: number): number {
  const base = OCCUPANCY_BY_HOUR[((hour % 24) + 24) % 24];
  const factor = WEEKDAY_FACTOR[((weekday % 7) + 7) % 7];
  return Math.min(MAX_OCCUPANCY, base * factor);
}

export function dwellMinutesFor(roomType: string | null): number {
  const type = (roomType ?? "").toLowerCase();
  for (const [needle, minutes] of DWELL_MINUTES) {
    if (type.includes(needle)) return minutes;
  }
  return DEFAULT_DWELL_MINUTES;
}

export function effectiveCapacity(capacity: number | null): number {
  return capacity != null && capacity > 0 ? capacity : DEFAULT_ROOM_CAPACITY;
}

export function effectiveCpm(cpm: number | null | undefined): number {
  return cpm != null && Number.isFinite(cpm) && cpm >= 0 ? cpm : DEFAULT_AD_CPM_KES;
}

export interface EstimateRoom {
  capacity: number | null;
  roomType: string | null;
  /** Paired screens in the room (0 for a room only unpaired players watch). */
  pairedScreens: number;
}

export interface AudienceEstimate {
  views: number;
  reach: number;
  revenue: number;
}

export const ZERO_ESTIMATE: AudienceEstimate = { views: 0, reach: 0, revenue: 0 };

/** One airing, one room. Unrounded — sum first, round for display. */
export function estimateAiringInRoom(input: {
  room: EstimateRoom;
  hour: number;
  weekday: number;
  /** Players in this room that showed the airing. */
  screensShown: number;
  frequencyMinutes: number | null;
  cpm: number | null;
}): AudienceEstimate {
  const { room, hour, weekday, screensShown, frequencyMinutes } = input;
  if (screensShown <= 0) return ZERO_ESTIMATE;
  const share = room.pairedScreens > 0 ? Math.min(1, screensShown / room.pairedScreens) : 1;
  const views = effectiveCapacity(room.capacity) * occupancyAt(hour, weekday) * AD_ATTENTION_RATE * share;
  const exposuresPerVisitor =
    frequencyMinutes != null && frequencyMinutes > 0 ? Math.max(1, dwellMinutesFor(room.roomType) / frequencyMinutes) : 1;
  return {
    views,
    reach: views / exposuresPerVisitor,
    revenue: (views / 1000) * effectiveCpm(input.cpm),
  };
}

export function addEstimates(a: AudienceEstimate, b: AudienceEstimate): AudienceEstimate {
  return { views: a.views + b.views, reach: a.reach + b.reach, revenue: a.revenue + b.revenue };
}

export interface BudgetRule {
  type: "daily" | "total";
  amount: number | null;
}

/**
 * Caps raw estimated revenue by each campaign's budget. `rows` are per
 * campaign per local day (YYYY-MM-DD); a daily budget caps each day, a total
 * budget caps the running sum in date order. Returns capped revenue keyed
 * `${campaignId}|${dayKey}`. Campaigns without a budget are uncapped.
 */
export function applyBudgetCaps(
  rows: { campaignId: string; dayKey: string; revenue: number }[],
  budgets: Map<string, BudgetRule>,
): Map<string, number> {
  const out = new Map<string, number>();
  const byCampaign = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const days = byCampaign.get(row.campaignId) ?? new Map<string, number>();
    days.set(row.dayKey, (days.get(row.dayKey) ?? 0) + row.revenue);
    byCampaign.set(row.campaignId, days);
  }
  for (const [campaignId, days] of byCampaign) {
    const budget = budgets.get(campaignId);
    const amount = budget?.amount != null && budget.amount > 0 ? budget.amount : null;
    let remaining = amount;
    for (const dayKey of [...days.keys()].sort()) {
      const raw = days.get(dayKey)!;
      let capped = raw;
      if (amount != null && budget!.type === "daily") capped = Math.min(raw, amount);
      if (amount != null && budget!.type === "total") {
        capped = Math.min(raw, Math.max(0, remaining!));
        remaining = remaining! - capped;
      }
      out.set(`${campaignId}|${dayKey}`, capped);
    }
  }
  return out;
}

// ── Projection (Create Campaign wizard) ─────────────────────────────────

export interface ProjectionRoom extends EstimateRoom {
  /** Players in this room the campaign would show on (≥1 when room-level
   * covered with no paired screens — an unpaired player still counts). */
  targetedPlayers: number;
  /** Average CPM of the targeted screens (null = default). */
  cpm: number | null;
}

export interface CampaignProjection {
  airingsPerDay: number;
  playsPerDay: number;
  viewsPerDay: number;
  reachPerDay: number;
  /** Before budget caps. */
  revenuePerDay: number;
  days: number;
  /** True when the campaign has no end date and `days` is a 30-day sample. */
  openEnded: boolean;
  totalPlays: number;
  totalViews: number;
  totalReach: number;
  /** After budget caps. */
  totalRevenue: number;
  /** Share of the budget the capped revenue would consume, 0–100 (null = no budget). */
  budgetUsedPct: number | null;
}

function windowMinutes(activeStart: string | null, activeEnd: string | null): { start: number; length: number } {
  const start = timeToMinutes(normalizeTime(activeStart) ?? DEFAULT_VENUE_START)!;
  const end = timeToMinutes(normalizeTime(activeEnd) ?? DEFAULT_VENUE_END)!;
  if (start === end) return { start, length: 24 * 60 };
  return { start, length: end > start ? end - start : 24 * 60 - start + end };
}

export function inclusiveDays(startDate: string | null, endDate: string | null): number | null {
  if (!startDate || !endDate) return null;
  const ms = Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`);
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.round(ms / 86_400_000) + 1;
}

export function projectCampaignDelivery(input: {
  rooms: ProjectionRoom[];
  frequencyMinutes: number | null;
  maxPlaysPerDay: number | null;
  activeStart: string | null;
  activeEnd: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: BudgetRule;
}): CampaignProjection {
  const { length, start } = windowMinutes(input.activeStart, input.activeEnd);
  const freq = input.frequencyMinutes != null && input.frequencyMinutes >= 1 ? input.frequencyMinutes : null;
  let airingsPerDay = freq ? Math.floor(length / freq) : 0;
  if (input.maxPlaysPerDay != null && input.maxPlaysPerDay > 0) airingsPerDay = Math.min(airingsPerDay, input.maxPlaysPerDay);

  const avgWeekday = WEEKDAY_FACTOR.reduce((s, f) => s + f, 0) / WEEKDAY_FACTOR.length;
  let daily: AudienceEstimate = ZERO_ESTIMATE;
  let playsPerDay = 0;
  for (const room of input.rooms) {
    if (room.targetedPlayers <= 0) continue;
    playsPerDay += airingsPerDay * room.targetedPlayers;
    for (let i = 0; i < airingsPerDay; i++) {
      const minuteOfDay = (start + ((i + 0.5) * length) / airingsPerDay) % (24 * 60);
      const hour = Math.floor(minuteOfDay / 60);
      // Average weekday: scale a Monday estimate by the mean weekday factor.
      const monday = estimateAiringInRoom({
        room,
        hour,
        weekday: 0,
        screensShown: room.targetedPlayers,
        frequencyMinutes: freq,
        cpm: room.cpm,
      });
      const scale = avgWeekday / WEEKDAY_FACTOR[0];
      daily = addEstimates(daily, { views: monday.views * scale, reach: monday.reach * scale, revenue: monday.revenue * scale });
    }
  }

  const exactDays = inclusiveDays(input.startDate, input.endDate);
  const days = exactDays ?? 30;
  const budgetAmount = input.budget.amount != null && input.budget.amount > 0 ? input.budget.amount : null;
  let totalRevenue: number;
  if (budgetAmount != null && input.budget.type === "daily") {
    totalRevenue = Math.min(daily.revenue, budgetAmount) * days;
  } else if (budgetAmount != null) {
    totalRevenue = Math.min(daily.revenue * days, budgetAmount);
  } else {
    totalRevenue = daily.revenue * days;
  }
  const budgetBase = budgetAmount == null ? null : input.budget.type === "daily" ? budgetAmount * days : budgetAmount;

  return {
    airingsPerDay,
    playsPerDay,
    viewsPerDay: daily.views,
    reachPerDay: daily.reach,
    revenuePerDay: daily.revenue,
    days,
    openEnded: exactDays == null,
    totalPlays: playsPerDay * days,
    totalViews: daily.views * days,
    totalReach: daily.reach * days,
    totalRevenue,
    budgetUsedPct: budgetBase ? Math.min(100, (totalRevenue / budgetBase) * 100) : null,
  };
}
