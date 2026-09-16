import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ANNOUNCEMENT_FRESH_MS,
  airingIdFor,
  decideFiring,
  duckedVolume,
  repeatMatchesDay,
  targetCoversRoom,
} from "./announcement-airing";

const TZ = "Africa/Nairobi"; // UTC+3, no DST
const at = (iso: string) => new Date(iso);

test("a sent announcement is on air only while fresh", () => {
  const row = { status: "sent", repeat: "none", scheduled_at: null, sent_at: "2026-09-16T07:00:00.000Z" };
  assert.deepEqual(decideFiring(row, TZ, at("2026-09-16T07:00:10Z")), { kind: "on-air", firedAt: row.sent_at });
  assert.deepEqual(decideFiring(row, TZ, new Date(Date.parse(row.sent_at) + ANNOUNCEMENT_FRESH_MS + 1)), { kind: "none" });
  assert.deepEqual(decideFiring({ ...row, sent_at: null }, TZ, at("2026-09-16T07:00:10Z")), { kind: "none" });
});

test("drafts never air", () => {
  const row = { status: "draft", repeat: "none", scheduled_at: "2026-09-16T07:00:00Z", sent_at: null };
  assert.deepEqual(decideFiring(row, TZ, at("2026-09-16T07:00:10Z")), { kind: "none" });
});

test("a one-off scheduled announcement fires at its time, not before, not long after", () => {
  const row = { status: "scheduled", repeat: "none", scheduled_at: "2026-09-16T07:00:00.000Z", sent_at: null };
  assert.deepEqual(decideFiring(row, TZ, at("2026-09-16T07:00:20Z")), {
    kind: "fire",
    occurrenceAt: row.scheduled_at,
    repeating: false,
  });
  assert.deepEqual(decideFiring(row, TZ, at("2026-09-16T06:59:55Z")), { kind: "none" });
  assert.deepEqual(decideFiring(row, TZ, at("2026-09-16T07:02:00Z")), { kind: "none" });
});

test("a daily announcement fires each day at the start's local time, once per occurrence", () => {
  const row = { status: "scheduled", repeat: "daily", scheduled_at: "2026-09-01T07:00:00.000Z", sent_at: null };
  const now = at("2026-09-16T07:00:30Z");
  assert.deepEqual(decideFiring(row, TZ, now), { kind: "fire", occurrenceAt: "2026-09-16T07:00:00.000Z", repeating: true });
  // Fired yesterday → today's occurrence is still due.
  assert.equal(decideFiring({ ...row, sent_at: "2026-09-15T07:00:04.000Z" }, TZ, now).kind, "fire");
  // Already fired for today's occurrence → deliver that airing instead.
  assert.deepEqual(decideFiring({ ...row, sent_at: "2026-09-16T07:00:04.000Z" }, TZ, now), {
    kind: "on-air",
    firedAt: "2026-09-16T07:00:04.000Z",
  });
  // Between occurrences.
  assert.deepEqual(decideFiring(row, TZ, at("2026-09-16T12:00:00Z")), { kind: "none" });
});

test("a repeating announcement never fires before its start date", () => {
  const row = { status: "scheduled", repeat: "daily", scheduled_at: "2026-09-20T07:00:00.000Z", sent_at: null };
  assert.deepEqual(decideFiring(row, TZ, at("2026-09-16T07:00:30Z")), { kind: "none" });
});

test("an occurrence just before local midnight is caught just after it", () => {
  // 23:59:50 Nairobi.
  const row = { status: "scheduled", repeat: "daily", scheduled_at: "2026-09-01T20:59:50.000Z", sent_at: null };
  assert.deepEqual(decideFiring(row, TZ, at("2026-09-16T21:00:20Z")), {
    kind: "fire",
    occurrenceAt: "2026-09-16T20:59:50.000Z",
    repeating: true,
  });
});

test("weekday, weekend and weekly rules follow the local day", () => {
  // 2026-09-16 is a Wednesday, 2026-09-19 a Saturday.
  const base = { status: "scheduled", scheduled_at: "2026-09-02T07:00:00.000Z", sent_at: null }; // a Wednesday
  const wed = at("2026-09-16T07:00:30Z");
  const sat = at("2026-09-19T07:00:30Z");
  assert.equal(decideFiring({ ...base, repeat: "weekdays" }, TZ, wed).kind, "fire");
  assert.equal(decideFiring({ ...base, repeat: "weekdays" }, TZ, sat).kind, "none");
  assert.equal(decideFiring({ ...base, repeat: "weekends" }, TZ, sat).kind, "fire");
  assert.equal(decideFiring({ ...base, repeat: "weekends" }, TZ, wed).kind, "none");
  assert.equal(decideFiring({ ...base, repeat: "weekly" }, TZ, wed).kind, "fire");
  assert.equal(decideFiring({ ...base, repeat: "weekly" }, TZ, at("2026-09-17T07:00:30Z")).kind, "none");
  assert.equal(decideFiring({ ...base, repeat: "custom" }, TZ, sat).kind, "fire");
});

test("repeatMatchesDay rejects unknown rules", () => {
  assert.equal(repeatMatchesDay("none", 2, 2), false);
  assert.equal(repeatMatchesDay("fortnightly", 2, 2), false);
});

test("targetCoversRoom matches rooms directly and through location, zone, audio zone", () => {
  const room = { roomId: "r1", branchId: "b1", zoneId: "z1", audioZoneIds: ["az1"] };
  const empty = { locationIds: [], zoneIds: [], roomIds: [], audioZoneIds: [] };
  assert.equal(targetCoversRoom({ ...empty, roomIds: ["r1"] }, room), true);
  assert.equal(targetCoversRoom({ ...empty, locationIds: ["b1"] }, room), true);
  assert.equal(targetCoversRoom({ ...empty, zoneIds: ["z1"] }, room), true);
  assert.equal(targetCoversRoom({ ...empty, audioZoneIds: ["az1"] }, room), true);
  assert.equal(targetCoversRoom({ locationIds: ["b2"], zoneIds: ["z2"], roomIds: ["r2"], audioZoneIds: ["az2"] }, room), false);
  assert.equal(targetCoversRoom({ ...empty, zoneIds: ["z1"] }, { ...room, zoneId: null }), false);
});

test("duckedVolume silences for pause and scales for reduce", () => {
  assert.equal(duckedVolume(80, { playbackMode: "pause", reducedVolumePercent: 20 }), 0);
  assert.equal(duckedVolume(80, { playbackMode: "reduce", reducedVolumePercent: 25 }), 20);
  assert.equal(duckedVolume(80, { playbackMode: "reduce", reducedVolumePercent: 150 }), 80);
});

test("airingIdFor distinguishes resends of the same announcement", () => {
  assert.notEqual(airingIdFor("a", "2026-09-16T07:00:00Z"), airingIdFor("a", "2026-09-16T07:05:00Z"));
  assert.equal(airingIdFor("a", "2026-09-16T07:00:00Z"), airingIdFor("a", "2026-09-16T07:00:00.000Z"));
});
