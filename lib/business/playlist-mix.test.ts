import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chooseMixSource,
  pickLeastRecentlyPlayed,
  resolveMixPick,
  mixRefillNeeds,
  type MixItem,
} from "./playlist-mix";

const HOUR = 60 * 60 * 1000;
const NOW = Date.parse("2026-09-16T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

function item(youtubeId: string, order: number, lastPlayedAt: string | null = null): MixItem {
  return { youtubeId, order, lastPlayedAt };
}

test("chooseMixSource: after a fresh song, a saved song comes next", () => {
  const counts = { saved: 3, genre: 3, ai: 3 };
  assert.equal(chooseMixSource({ current: "genre", counts, roll: 0.99 }), "saved");
  assert.equal(chooseMixSource({ current: "ai", counts, roll: 0.99 }), "saved");
});

test("chooseMixSource: weighted 50/25/25 across available sources", () => {
  const counts = { saved: 3, genre: 3, ai: 3 };
  assert.equal(chooseMixSource({ current: "saved", counts, roll: 0.1 }), "saved");
  assert.equal(chooseMixSource({ current: "saved", counts, roll: 0.6 }), "genre");
  assert.equal(chooseMixSource({ current: "saved", counts, roll: 0.9 }), "ai");
});

test("chooseMixSource: renormalizes over non-empty sources", () => {
  assert.equal(chooseMixSource({ current: null, counts: { saved: 0, genre: 2, ai: 0 }, roll: 0.99 }), "genre");
  assert.equal(chooseMixSource({ current: "genre", counts: { saved: 0, genre: 2, ai: 2 }, roll: 0.1 }), "genre");
  assert.equal(chooseMixSource({ current: null, counts: { saved: 0, genre: 0, ai: 0 }, roll: 0.5 }), null);
});

test("pickLeastRecentlyPlayed: never-played first in order, then oldest", () => {
  const items = [
    item("b", 1, ago(1 * HOUR)),
    item("c", 2, null),
    item("a", 0, ago(5 * HOUR)),
    item("d", 3, null),
  ];
  assert.equal(pickLeastRecentlyPlayed(items, null)?.youtubeId, "c");
  const played = [item("b", 1, ago(1 * HOUR)), item("a", 0, ago(5 * HOUR))];
  assert.equal(pickLeastRecentlyPlayed(played, null)?.youtubeId, "a");
});

test("pickLeastRecentlyPlayed: never returns the current track", () => {
  assert.equal(pickLeastRecentlyPlayed([item("a", 0)], "a"), null);
  assert.equal(pickLeastRecentlyPlayed([item("a", 0), item("b", 1, ago(HOUR))], "a")?.youtubeId, "b");
});

test("resolveMixPick: falls through to another source when the chosen one has only the current track", () => {
  const pick = resolveMixPick({
    currentYoutubeId: "s1",
    bySource: { saved: [item("s1", 0)], genre: [item("g1", 0)], ai: [] },
    roll: 0.1, // would choose saved
  });
  assert.deepEqual(pick && { source: pick.source, id: pick.item.youtubeId }, { source: "genre", id: "g1" });
});

test("resolveMixPick: identifies the current source to enforce saved-after-fresh", () => {
  const pick = resolveMixPick({
    currentYoutubeId: "g1",
    bySource: { saved: [item("s1", 0)], genre: [item("g1", 0), item("g2", 1)], ai: [] },
    roll: 0.99,
  });
  assert.equal(pick?.source, "saved");
});

test("resolveMixPick: nothing playable -> null", () => {
  assert.equal(
    resolveMixPick({ currentYoutubeId: "s1", bySource: { saved: [item("s1", 0)], genre: [], ai: [] }, roll: 0.5 }),
    null,
  );
});

test("mixRefillNeeds: refills genre pool when few fresh songs and not refreshed recently", () => {
  const needs = mixRefillNeeds({
    genresCount: 2,
    savedCount: 5,
    pool: [],
    genreRefreshedAt: null,
    aiRefreshedAt: null,
    now: NOW,
  });
  assert.deepEqual(needs, { genre: true, ai: true });
});

test("mixRefillNeeds: respects refresh throttles", () => {
  const needs = mixRefillNeeds({
    genresCount: 2,
    savedCount: 5,
    pool: [],
    genreRefreshedAt: ago(1 * HOUR),
    aiRefreshedAt: ago(10 * HOUR),
    now: NOW,
  });
  assert.deepEqual(needs, { genre: false, ai: false });
});

test("mixRefillNeeds: enough fresh songs -> no refill; played-long-ago counts as fresh", () => {
  const pool = [
    ...Array.from({ length: 10 }, () => ({ source: "genre" as const, lastPlayedAt: ago(30 * HOUR) })),
    ...Array.from({ length: 5 }, () => ({ source: "ai" as const, lastPlayedAt: null })),
  ];
  assert.deepEqual(
    mixRefillNeeds({ genresCount: 1, savedCount: 1, pool, genreRefreshedAt: null, aiRefreshedAt: null, now: NOW }),
    { genre: false, ai: false },
  );
});

test("mixRefillNeeds: no genres -> no genre refill; nothing to base AI on -> no AI refill", () => {
  assert.deepEqual(
    mixRefillNeeds({ genresCount: 0, savedCount: 0, pool: [], genreRefreshedAt: null, aiRefreshedAt: null, now: NOW }),
    { genre: false, ai: false },
  );
  assert.deepEqual(
    mixRefillNeeds({ genresCount: 0, savedCount: 3, pool: [], genreRefreshedAt: null, aiRefreshedAt: null, now: NOW }),
    { genre: false, ai: true },
  );
});

test("mixRefillNeeds: pool at cap -> no refill", () => {
  const pool = Array.from({ length: 200 }, () => ({ source: "genre" as const, lastPlayedAt: ago(HOUR) }));
  assert.deepEqual(
    mixRefillNeeds({ genresCount: 1, savedCount: 1, pool, genreRefreshedAt: null, aiRefreshedAt: null, now: NOW }),
    { genre: false, ai: false },
  );
});
