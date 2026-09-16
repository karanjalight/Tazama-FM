import { test } from "node:test";
import assert from "node:assert/strict";
import { cursorAfterAdvance, cursorBasis, upcomingIndices } from "./playlist-cursor";

test("basis prefers the saved cursor over the current track", () => {
  assert.equal(cursorBasis("playlist-3", "request-1"), "playlist-3");
});

test("basis falls back to the current track when no cursor is saved", () => {
  assert.equal(cursorBasis(null, "playlist-3"), "playlist-3");
  assert.equal(cursorBasis(undefined, "playlist-3"), "playlist-3");
  assert.equal(cursorBasis("", "playlist-3"), "playlist-3");
});

test("basis is null when nothing is known", () => {
  assert.equal(cursorBasis(null, null), null);
});

test("a request keeps the playlist's resume point", () => {
  assert.equal(cursorAfterAdvance({ interruptsPlaylist: true, basisYoutubeId: "playlist-3" }), "playlist-3");
});

test("a normal playlist advance clears the cursor", () => {
  assert.equal(cursorAfterAdvance({ interruptsPlaylist: false, basisYoutubeId: "playlist-3" }), null);
});

test("two requests in a row keep the same resume point", () => {
  const first = cursorAfterAdvance({ interruptsPlaylist: true, basisYoutubeId: cursorBasis(null, "playlist-3") });
  const second = cursorAfterAdvance({ interruptsPlaylist: true, basisYoutubeId: cursorBasis(first, "request-1") });
  assert.equal(second, "playlist-3");
});

test("upcoming starts right after the basis", () => {
  assert.deepEqual(upcomingIndices(6, 2, 3), [3, 4, 5]);
});

test("upcoming wraps around the end of the playlist", () => {
  assert.deepEqual(upcomingIndices(5, 3, 3), [4, 0, 1]);
});

test("unknown basis previews from the top", () => {
  assert.deepEqual(upcomingIndices(4, -1, 2), [0, 1]);
});

test("upcoming never lists more entries than the playlist has", () => {
  assert.deepEqual(upcomingIndices(3, 1, 5), [2, 0, 1]);
});

test("empty playlist or zero count previews nothing", () => {
  assert.deepEqual(upcomingIndices(0, -1, 5), []);
  assert.deepEqual(upcomingIndices(4, 1, 0), []);
});
