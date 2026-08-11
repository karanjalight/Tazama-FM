import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStreakDays, eligibleBadges, type BadgeStats } from "./rules";

test("computeStreakDays: empty input is zero", () => {
  assert.equal(computeStreakDays([]), 0);
});

test("computeStreakDays: a single day is a streak of one", () => {
  assert.equal(computeStreakDays(["2026-08-11"]), 1);
});

test("computeStreakDays: consecutive days count up", () => {
  assert.equal(
    computeStreakDays(["2026-08-09", "2026-08-10", "2026-08-11"]),
    3,
  );
});

test("computeStreakDays: a gap breaks the streak, counted from the latest day", () => {
  assert.equal(
    computeStreakDays(["2026-08-01", "2026-08-10", "2026-08-11"]),
    2,
  );
});

test("computeStreakDays: duplicate day entries don't inflate the count", () => {
  assert.equal(
    computeStreakDays(["2026-08-11", "2026-08-11", "2026-08-10"]),
    2,
  );
});

function stats(overrides: Partial<BadgeStats>): BadgeStats {
  return {
    totalPlays: 0,
    distinctGenres: 0,
    streakDays: 0,
    sharesPlayedByOthers: 0,
    activeConversations: 0,
    nightOwlPlays: 0,
    distinctTracks: 0,
    ...overrides,
  };
}

test("eligibleBadges: no activity earns nothing", () => {
  assert.deepEqual(eligibleBadges(stats({})), []);
});

test("eligibleBadges: first play earns exactly first-spin", () => {
  assert.deepEqual(eligibleBadges(stats({ totalPlays: 1 })), ["first-spin"]);
});

test("eligibleBadges: a 30-day streak earns both streak badges, not just the higher one", () => {
  const earned = eligibleBadges(stats({ totalPlays: 1, streakDays: 30 }));
  assert.ok(earned.includes("on-a-roll"));
  assert.ok(earned.includes("unstoppable"));
});

test("eligibleBadges: threshold badges require meeting the full count, not close", () => {
  assert.deepEqual(
    eligibleBadges(stats({ totalPlays: 1, distinctGenres: 9 })),
    ["first-spin"],
  );
  assert.ok(
    eligibleBadges(stats({ totalPlays: 1, distinctGenres: 10 })).includes(
      "genre-explorer",
    ),
  );
});
