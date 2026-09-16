import { test } from "node:test";
import assert from "node:assert/strict";

import {
  AD_ATTENTION_RATE,
  DEFAULT_AD_CPM_KES,
  DEFAULT_ROOM_CAPACITY,
  applyBudgetCaps,
  dwellMinutesFor,
  estimateAiringInRoom,
  inclusiveDays,
  occupancyAt,
  projectCampaignDelivery,
  type BudgetRule,
} from "./ad-estimates";

const close = (actual: number, expected: number, eps = 1e-6) =>
  assert.ok(Math.abs(actual - expected) < eps, `expected ${expected}, got ${actual}`);

test("occupancy peaks in the evening and on weekends, capped below full", () => {
  assert.ok(occupancyAt(19, 0) > occupancyAt(15, 0));
  assert.ok(occupancyAt(19, 5) > occupancyAt(19, 0));
  assert.ok(occupancyAt(3, 5) < 0.1);
  for (let h = 0; h < 24; h++) for (let d = 0; d < 7; d++) assert.ok(occupancyAt(h, d) <= 0.95);
});

test("dwell minutes by room type", () => {
  assert.equal(dwellMinutesFor("Bar / Lounge"), 90);
  assert.equal(dwellMinutesFor("Dining Area"), 75);
  assert.equal(dwellMinutesFor("Private Room"), 120);
  assert.equal(dwellMinutesFor(null), 60);
});

test("estimateAiringInRoom: views, reach and revenue", () => {
  const room = { capacity: 120, roomType: "Dining Area", pairedScreens: 2 };
  const est = estimateAiringInRoom({ room, hour: 19, weekday: 0, screensShown: 2, frequencyMinutes: 15, cpm: 500 });
  const views = 120 * occupancyAt(19, 0) * AD_ATTENTION_RATE;
  close(est.views, views);
  close(est.reach, views / (75 / 15));
  close(est.revenue, (views / 1000) * 500);
});

test("estimateAiringInRoom: partial screen share, defaults, zero plays", () => {
  const room = { capacity: null, roomType: null, pairedScreens: 4 };
  const one = estimateAiringInRoom({ room, hour: 12, weekday: 2, screensShown: 1, frequencyMinutes: null, cpm: null });
  const views = DEFAULT_ROOM_CAPACITY * occupancyAt(12, 2) * AD_ATTENTION_RATE * 0.25;
  close(one.views, views);
  close(one.reach, views); // no frequency → one exposure per visitor
  close(one.revenue, (views / 1000) * DEFAULT_AD_CPM_KES);
  assert.deepEqual(
    estimateAiringInRoom({ room, hour: 12, weekday: 2, screensShown: 0, frequencyMinutes: 5, cpm: 100 }),
    { views: 0, reach: 0, revenue: 0 },
  );
});

test("estimateAiringInRoom: unpaired player in a room with no paired screens counts as the whole room", () => {
  const est = estimateAiringInRoom({
    room: { capacity: 50, roomType: "Lounge", pairedScreens: 0 },
    hour: 20,
    weekday: 4,
    screensShown: 1,
    frequencyMinutes: 30,
    cpm: 0,
  });
  close(est.views, 50 * occupancyAt(20, 4) * AD_ATTENTION_RATE);
  assert.equal(est.revenue, 0);
});

test("applyBudgetCaps: daily caps each day, total caps the running sum", () => {
  const budgets = new Map<string, BudgetRule>([
    ["daily", { type: "daily", amount: 100 }],
    ["total", { type: "total", amount: 250 }],
    ["none", { type: "total", amount: null }],
  ]);
  const capped = applyBudgetCaps(
    [
      { campaignId: "daily", dayKey: "2026-09-01", revenue: 80 },
      { campaignId: "daily", dayKey: "2026-09-02", revenue: 70 },
      { campaignId: "daily", dayKey: "2026-09-02", revenue: 70 },
      { campaignId: "total", dayKey: "2026-09-02", revenue: 200 },
      { campaignId: "total", dayKey: "2026-09-01", revenue: 120 },
      { campaignId: "total", dayKey: "2026-09-03", revenue: 90 },
      { campaignId: "none", dayKey: "2026-09-01", revenue: 999 },
    ],
    budgets,
  );
  assert.equal(capped.get("daily|2026-09-01"), 80);
  assert.equal(capped.get("daily|2026-09-02"), 100);
  assert.equal(capped.get("total|2026-09-01"), 120);
  assert.equal(capped.get("total|2026-09-02"), 130);
  assert.equal(capped.get("total|2026-09-03"), 0);
  assert.equal(capped.get("none|2026-09-01"), 999);
});

test("inclusiveDays", () => {
  assert.equal(inclusiveDays("2026-09-01", "2026-09-14"), 14);
  assert.equal(inclusiveDays("2026-09-01", "2026-09-01"), 1);
  assert.equal(inclusiveDays(null, "2026-09-01"), null);
  assert.equal(inclusiveDays("2026-09-05", "2026-09-01"), null);
});

test("projectCampaignDelivery: airings respect frequency and daily cap", () => {
  const base = {
    rooms: [{ capacity: 120, roomType: "Dining Area", pairedScreens: 2, targetedPlayers: 2, cpm: 400 }],
    activeStart: "16:00",
    activeEnd: "21:00",
    startDate: "2026-09-01",
    endDate: "2026-09-14",
    budget: { type: "daily", amount: null } as BudgetRule,
  };
  const uncapped = projectCampaignDelivery({ ...base, frequencyMinutes: 15, maxPlaysPerDay: null });
  assert.equal(uncapped.airingsPerDay, 20);
  assert.equal(uncapped.playsPerDay, 40);
  assert.equal(uncapped.days, 14);
  assert.equal(uncapped.totalPlays, 560);
  assert.ok(uncapped.viewsPerDay > 0 && uncapped.reachPerDay < uncapped.viewsPerDay);

  const capped = projectCampaignDelivery({ ...base, frequencyMinutes: 15, maxPlaysPerDay: 8 });
  assert.equal(capped.airingsPerDay, 8);
  assert.equal(capped.playsPerDay, 16);

  const none = projectCampaignDelivery({ ...base, frequencyMinutes: null, maxPlaysPerDay: 8 });
  assert.equal(none.playsPerDay, 0);
  assert.equal(none.totalRevenue, 0);
});

test("projectCampaignDelivery: budgets cap revenue; open-ended campaigns sample 30 days", () => {
  const rooms = [{ capacity: 200, roomType: "Bar", pairedScreens: 4, targetedPlayers: 4, cpm: 2000 }];
  const common = { rooms, frequencyMinutes: 5, maxPlaysPerDay: null, activeStart: "08:00", activeEnd: "23:00" };

  const daily = projectCampaignDelivery({ ...common, startDate: "2026-09-01", endDate: "2026-09-10", budget: { type: "daily", amount: 50 } });
  assert.ok(daily.revenuePerDay > 50);
  close(daily.totalRevenue, 500);
  assert.equal(daily.budgetUsedPct, 100);

  const total = projectCampaignDelivery({ ...common, startDate: null, endDate: null, budget: { type: "total", amount: 1000 } });
  assert.equal(total.days, 30);
  assert.equal(total.openEnded, true);
  close(total.totalRevenue, 1000);
});

test("projectCampaignDelivery: overnight window length", () => {
  const p = projectCampaignDelivery({
    rooms: [{ capacity: 50, roomType: "Club", pairedScreens: 1, targetedPlayers: 1, cpm: null }],
    frequencyMinutes: 30,
    maxPlaysPerDay: null,
    activeStart: "22:00",
    activeEnd: "02:00",
    startDate: "2026-09-01",
    endDate: "2026-09-01",
    budget: { type: "total", amount: null },
  });
  assert.equal(p.airingsPerDay, 8);
});
