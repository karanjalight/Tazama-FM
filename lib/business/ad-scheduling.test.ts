import { test } from "node:test";
import assert from "node:assert/strict";

import {
  adDurationSeconds,
  adPausesMusic,
  adShowsOnPlayer,
  isAdStale,
  isWithinCampaignWindow,
  localDateParts,
  normalizeTime,
  parseFrequencyMinutes,
  rankDueCampaigns,
  resolveBreakTargets,
  startOfLocalDayMs,
  AD_STALE_GRACE_MS,
  type SourceHistory,
} from "./ad-scheduling";

test("adDurationSeconds prefers media length for video/audio and display time for images", () => {
  assert.equal(adDurationSeconds("video", 22.4, 10), 22);
  assert.equal(adDurationSeconds("video", null, null), 30);
  assert.equal(adDurationSeconds("audio", 0, 12), 12);
  assert.equal(adDurationSeconds("image", null, 8), 8);
  assert.equal(adDurationSeconds("image", null, null), 15);
  assert.equal(adDurationSeconds("document", 40, null), 40);
});

test("only full video/audio breaks pause music", () => {
  assert.equal(adPausesMusic("video", null), true);
  assert.equal(adPausesMusic("audio", null), true);
  assert.equal(adPausesMusic("video", ["room-a"]), false);
  assert.equal(adPausesMusic("image", null), false);
});

test("adShowsOnPlayer matches full breaks, rooms, and paired screens", () => {
  const full = { roomIds: null, screenIds: [] };
  const partial = { roomIds: ["room-a"], screenIds: ["screen-9"] };
  assert.equal(adShowsOnPlayer(full, { roomId: "anything", deviceId: null }), true);
  assert.equal(adShowsOnPlayer(partial, { roomId: "room-a", deviceId: null }), true);
  assert.equal(adShowsOnPlayer(partial, { roomId: "room-b", deviceId: "screen-9" }), true);
  assert.equal(adShowsOnPlayer(partial, { roomId: "room-b", deviceId: "screen-1" }), false);
  assert.equal(adShowsOnPlayer(partial, { roomId: "room-b", deviceId: null }), false);
});

test("isAdStale waits a grace period past endsAt", () => {
  const endsAt = "2026-09-16T10:00:00.000Z";
  const end = Date.parse(endsAt);
  assert.equal(isAdStale({ endsAt }, end + AD_STALE_GRACE_MS), false);
  assert.equal(isAdStale({ endsAt }, end + AD_STALE_GRACE_MS + 1), true);
});

test("localDateParts resolves Nairobi time and Monday-based weekday", () => {
  // 2026-09-16 is a Wednesday. 21:30 UTC = 00:30 Thursday in Nairobi (UTC+3).
  const parts = localDateParts("Africa/Nairobi", new Date("2026-09-16T21:30:05.000Z"));
  assert.equal(parts.isoDate, "2026-09-17");
  assert.equal(parts.hms, "00:30:05");
  assert.equal(parts.hour, 0);
  assert.equal(parts.weekday, 3);
});

test("localDateParts falls back to UTC for an invalid timezone", () => {
  const parts = localDateParts("Not/AZone", new Date("2026-09-16T08:15:00.000Z"));
  assert.equal(parts.hms, "08:15:00");
});

test("startOfLocalDayMs is local midnight as a UTC instant", () => {
  const now = new Date("2026-09-16T12:00:00.000Z"); // 15:00 in Nairobi
  assert.equal(new Date(startOfLocalDayMs("Africa/Nairobi", now)).toISOString(), "2026-09-15T21:00:00.000Z");
});

test("normalizeTime and parseFrequencyMinutes", () => {
  assert.equal(normalizeTime("9:05"), "09:05:00");
  assert.equal(normalizeTime("16:00:30"), "16:00:30");
  assert.equal(normalizeTime("nope"), null);
  assert.equal(parseFrequencyMinutes("15"), 15);
  assert.equal(parseFrequencyMinutes("0"), null);
  assert.equal(parseFrequencyMinutes(null), null);
});

test("isWithinCampaignWindow handles dates, daytime and overnight hours", () => {
  const day = { startDate: "2026-09-01", endDate: "2026-09-30", activeStartTime: "16:00", activeEndTime: "19:00:00" };
  assert.equal(isWithinCampaignWindow(day, { isoDate: "2026-09-16", hms: "16:00:00" }), true);
  assert.equal(isWithinCampaignWindow(day, { isoDate: "2026-09-16", hms: "19:00:00" }), false);
  assert.equal(isWithinCampaignWindow(day, { isoDate: "2026-10-01", hms: "17:00:00" }), false);

  const overnight = { startDate: null, endDate: null, activeStartTime: "20:00", activeEndTime: "02:00" };
  assert.equal(isWithinCampaignWindow(overnight, { isoDate: "2026-09-16", hms: "23:59:00" }), true);
  assert.equal(isWithinCampaignWindow(overnight, { isoDate: "2026-09-16", hms: "01:30:00" }), true);
  assert.equal(isWithinCampaignWindow(overnight, { isoDate: "2026-09-16", hms: "12:00:00" }), false);

  const open = { startDate: null, endDate: null, activeStartTime: null, activeEndTime: null };
  assert.equal(isWithinCampaignWindow(open, { isoDate: "2026-09-16", hms: "03:00:00" }), true);
});

test("rankDueCampaigns applies frequency, daily cap, priority and wait time", () => {
  const now = Date.parse("2026-09-16T12:00:00Z");
  const min = 60_000;
  const candidates = [
    { id: "no-cadence", priority: "critical", frequencyMinutes: null, maxPlaysPerDay: null },
    { id: "capped", priority: "critical", frequencyMinutes: 5, maxPlaysPerDay: 3 },
    { id: "too-soon", priority: "high", frequencyMinutes: 15, maxPlaysPerDay: null },
    { id: "normal-old", priority: "normal", frequencyMinutes: 10, maxPlaysPerDay: null },
    { id: "normal-never", priority: "normal", frequencyMinutes: 10, maxPlaysPerDay: null },
    { id: "high-due", priority: "high", frequencyMinutes: 5, maxPlaysPerDay: 20 },
  ];
  const history = new Map<string, SourceHistory>([
    ["capped", { lastStartedAtMs: now - 60 * min, todayCount: 3 }],
    ["too-soon", { lastStartedAtMs: now - 10 * min, todayCount: 1 }],
    ["normal-old", { lastStartedAtMs: now - 30 * min, todayCount: 2 }],
    ["high-due", { lastStartedAtMs: now - 5 * min, todayCount: 4 }],
  ]);
  assert.deepEqual(
    rankDueCampaigns(candidates, history, now).map((c) => c.id),
    ["high-due", "normal-never", "normal-old"],
  );
});

test("resolveBreakTargets: every room covered → full break", () => {
  const targets = resolveBreakTargets({
    rooms: [
      { id: "hall", allowsAds: true },
      { id: "bar", allowsAds: true },
    ],
    screens: [
      { id: "tv1", roomId: "hall", adsEnabled: true },
      { id: "tv2", roomId: "bar", adsEnabled: true },
    ],
    roomCovered: new Set(["hall", "bar"]),
    screenTargeted: new Set(),
  });
  assert.deepEqual(targets, { roomIds: null, screenIds: [] });
});

test("resolveBreakTargets: a screen with ads off turns its room into per-screen targets", () => {
  const targets = resolveBreakTargets({
    rooms: [
      { id: "hall", allowsAds: true },
      { id: "bar", allowsAds: true },
    ],
    screens: [
      { id: "tv1", roomId: "hall", adsEnabled: true },
      { id: "tv2", roomId: "hall", adsEnabled: false },
      { id: "tv3", roomId: "bar", adsEnabled: true },
    ],
    roomCovered: new Set(["hall", "bar"]),
    screenTargeted: new Set(),
  });
  assert.deepEqual(targets, { roomIds: ["bar"], screenIds: ["tv1"] });
});

test("resolveBreakTargets: individually picked screens only", () => {
  const targets = resolveBreakTargets({
    rooms: [{ id: "hall", allowsAds: true }],
    screens: [
      { id: "tv1", roomId: "hall", adsEnabled: true },
      { id: "tv2", roomId: "hall", adsEnabled: true },
    ],
    roomCovered: new Set(),
    screenTargeted: new Set(["tv2"]),
  });
  assert.deepEqual(targets, { roomIds: [], screenIds: ["tv2"] });
});

test("resolveBreakTargets: location without ads, or nothing covered → null", () => {
  assert.equal(
    resolveBreakTargets({
      rooms: [{ id: "hall", allowsAds: false }],
      screens: [{ id: "tv1", roomId: "hall", adsEnabled: true }],
      roomCovered: new Set(["hall"]),
      screenTargeted: new Set(["tv1"]),
    }),
    null,
  );
  assert.equal(
    resolveBreakTargets({
      rooms: [{ id: "hall", allowsAds: true }],
      screens: [],
      roomCovered: new Set(),
      screenTargeted: new Set(),
    }),
    null,
  );
});
