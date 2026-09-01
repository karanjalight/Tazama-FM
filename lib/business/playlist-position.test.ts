import { test } from "node:test";
import assert from "node:assert/strict";
import { nextPlaylistPosition } from "./playlist-position";

test("empty playlist -> position 0", () => {
  assert.equal(nextPlaylistPosition(0, null), 0);
});

test("current track not found in playlist -> starts at 0", () => {
  assert.equal(nextPlaylistPosition(5, null), 0);
});

test("advances to the next index", () => {
  assert.equal(nextPlaylistPosition(5, 2), 3);
});

test("wraps around at the end of the playlist", () => {
  assert.equal(nextPlaylistPosition(5, 4), 0);
});

test("single-track playlist always returns 0", () => {
  assert.equal(nextPlaylistPosition(1, 0), 0);
});
