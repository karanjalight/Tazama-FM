import { test } from "node:test";
import assert from "node:assert/strict";
import { computeFrozenPosition } from "./playback-freeze";

test("no current row -> position stays 0", () => {
  assert.equal(computeFrozenPosition(null, false, 1_000), 0);
});

test("pausing while playing freezes elapsed time into position", () => {
  const current = {
    positionMs: 5_000,
    isPlaying: true,
    updatedAt: new Date(1_000).toISOString(),
  };
  // 3000ms elapsed since updatedAt, and we're pausing (nextIsPlaying=false)
  assert.equal(computeFrozenPosition(current, false, 4_000), 8_000);
});

test("resuming (already paused) does not add elapsed time", () => {
  const current = {
    positionMs: 5_000,
    isPlaying: false,
    updatedAt: new Date(1_000).toISOString(),
  };
  assert.equal(computeFrozenPosition(current, true, 9_000), 5_000);
});

test("pausing while already paused does not double-add elapsed time", () => {
  const current = {
    positionMs: 5_000,
    isPlaying: false,
    updatedAt: new Date(1_000).toISOString(),
  };
  assert.equal(computeFrozenPosition(current, false, 9_000), 5_000);
});

test("never returns a negative position", () => {
  const current = {
    positionMs: 100,
    isPlaying: true,
    updatedAt: new Date(5_000).toISOString(),
  };
  // "now" before updatedAt (clock skew) would otherwise go negative
  assert.equal(computeFrozenPosition(current, false, 1_000), 100);
});
