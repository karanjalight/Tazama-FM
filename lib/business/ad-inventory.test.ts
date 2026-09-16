import { test } from "node:test";
import assert from "node:assert/strict";

import { addDaysIso, bookedMinutesOnDate, isDateInRange, screenAvailability, targetCoversScreen } from "./ad-inventory";

const screen = { id: "tv1", branchId: "loc1", zoneId: "zone1", roomId: "room1" };
const empty = { locationIds: [], zoneIds: [], roomIds: [], screenIds: [] };

test("targetCoversScreen at every level", () => {
  assert.equal(targetCoversScreen({ ...empty, screenIds: ["tv1"] }, screen), true);
  assert.equal(targetCoversScreen({ ...empty, roomIds: ["room1"] }, screen), true);
  assert.equal(targetCoversScreen({ ...empty, zoneIds: ["zone1"] }, screen), true);
  assert.equal(targetCoversScreen({ ...empty, locationIds: ["loc1"] }, screen), true);
  assert.equal(targetCoversScreen({ ...empty, roomIds: ["room2"], screenIds: ["tv2"] }, screen), false);
  assert.equal(targetCoversScreen({ ...empty, zoneIds: ["zone1"] }, { ...screen, zoneId: null }), false);
});

test("screenAvailability", () => {
  assert.equal(screenAvailability({ adsEnabled: false, locationAllowsAds: true, bookedTodayCount: 2 }), "Restricted");
  assert.equal(screenAvailability({ adsEnabled: true, locationAllowsAds: false, bookedTodayCount: 0 }), "Restricted");
  assert.equal(screenAvailability({ adsEnabled: true, locationAllowsAds: true, bookedTodayCount: 1 }), "Booked");
  assert.equal(screenAvailability({ adsEnabled: true, locationAllowsAds: true, bookedTodayCount: 0 }), "Available");
});

test("date helpers", () => {
  assert.equal(addDaysIso("2026-09-29", 3), "2026-10-02");
  assert.equal(isDateInRange({ startDate: "2026-09-01", endDate: null }, "2026-12-01"), true);
  assert.equal(isDateInRange({ startDate: "2026-09-01", endDate: "2026-09-02" }, "2026-09-03"), false);
});

test("bookedMinutesOnDate unions overlapping and overnight windows", () => {
  const w = (activeStartTime: string | null, activeEndTime: string | null, startDate: string | null = null, endDate: string | null = null) => ({
    startDate,
    endDate,
    activeStartTime,
    activeEndTime,
  });
  assert.equal(bookedMinutesOnDate([w("16:00", "19:00"), w("18:00", "21:00")], "2026-09-16"), 300);
  assert.equal(bookedMinutesOnDate([w("22:00", "02:00")], "2026-09-16"), 240);
  assert.equal(bookedMinutesOnDate([w(null, null), w("10:00", "11:00")], "2026-09-16"), 1440);
  assert.equal(bookedMinutesOnDate([w("10:00", "12:00", "2026-09-17")], "2026-09-16"), 0);
  assert.equal(bookedMinutesOnDate([], "2026-09-16"), 0);
});
