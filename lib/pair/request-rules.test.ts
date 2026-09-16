import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_REQUESTS_PER_GUEST,
  MAX_REQUESTS_PER_ROOM,
  checkRequest,
  cleanDisplayName,
  queuePositionLabel,
  requestedByFor,
} from "./request-rules";
import { asRoomTrack } from "./room-track";

const OPEN = { queuedByActor: 0, queuedInRoom: 0, alreadyQueued: false, isNowPlaying: false };

test("a fresh request is allowed", () => {
  assert.deepEqual(checkRequest(OPEN), { ok: true });
});

test("the song playing right now can't be requested", () => {
  const result = checkRequest({ ...OPEN, isNowPlaying: true });
  assert.equal(result.ok, false);
});

test("a song already waiting can't be requested again", () => {
  const result = checkRequest({ ...OPEN, alreadyQueued: true });
  assert.equal(result.ok, false);
});

test("a guest is capped at the per-guest limit", () => {
  assert.equal(checkRequest({ ...OPEN, queuedByActor: MAX_REQUESTS_PER_GUEST - 1 }).ok, true);
  assert.equal(checkRequest({ ...OPEN, queuedByActor: MAX_REQUESTS_PER_GUEST }).ok, false);
});

test("a room is capped at the per-room limit", () => {
  assert.equal(checkRequest({ ...OPEN, queuedInRoom: MAX_REQUESTS_PER_ROOM - 1 }).ok, true);
  assert.equal(checkRequest({ ...OPEN, queuedInRoom: MAX_REQUESTS_PER_ROOM }).ok, false);
});

test("display names are trimmed, collapsed and capped at 24 chars", () => {
  assert.equal(cleanDisplayName("  Amina   W  "), "Amina W");
  assert.equal(cleanDisplayName("x".repeat(40)), "x".repeat(24));
});

test("blank display names are rejected", () => {
  assert.equal(cleanDisplayName("   "), null);
  assert.equal(cleanDisplayName(""), null);
});

test("queue position labels read naturally", () => {
  assert.equal(queuePositionLabel(0), "Plays next");
  assert.equal(queuePositionLabel(1), "2nd in line");
  assert.equal(queuePositionLabel(2), "3rd in line");
  assert.equal(queuePositionLabel(3), "4th in line");
  assert.equal(queuePositionLabel(10), "11th in line");
  assert.equal(queuePositionLabel(11), "12th in line");
  assert.equal(queuePositionLabel(12), "13th in line");
  assert.equal(queuePositionLabel(20), "21st in line");
  assert.equal(queuePositionLabel(21), "22nd in line");
});

const NOW = Date.parse("2026-09-16T12:00:00Z");

test("requested-by shows for the song a request just started", () => {
  const name = requestedByFor({
    currentYoutubeId: "abc",
    lastClaim: { youtubeId: "abc", name: "Amina", claimedAt: "2026-09-16T11:58:00Z" },
    now: NOW,
  });
  assert.equal(name, "Amina");
});

test("requested-by falls back to a generic name", () => {
  const name = requestedByFor({
    currentYoutubeId: "abc",
    lastClaim: { youtubeId: "abc", name: null, claimedAt: "2026-09-16T11:58:00Z" },
    now: NOW,
  });
  assert.equal(name, "a guest");
});

test("requested-by is hidden once a different song is playing", () => {
  const name = requestedByFor({
    currentYoutubeId: "xyz",
    lastClaim: { youtubeId: "abc", name: "Amina", claimedAt: "2026-09-16T11:58:00Z" },
    now: NOW,
  });
  assert.equal(name, null);
});

test("requested-by ignores stale claims of the same song", () => {
  const name = requestedByFor({
    currentYoutubeId: "abc",
    lastClaim: { youtubeId: "abc", name: "Amina", claimedAt: "2026-09-16T10:00:00Z" },
    now: NOW,
  });
  assert.equal(name, null);
});

test("requested-by is null with nothing playing or nothing claimed", () => {
  assert.equal(requestedByFor({ currentYoutubeId: null, lastClaim: null, now: NOW }), null);
  assert.equal(requestedByFor({ currentYoutubeId: "abc", lastClaim: null, now: NOW }), null);
});

test("asRoomTrack keeps a valid track", () => {
  assert.deepEqual(asRoomTrack({ youtubeId: "abc", title: "Song", artist: "Band", thumbnailUrl: "https://x/y.jpg" }), {
    youtubeId: "abc",
    title: "Song",
    artist: "Band",
    thumbnailUrl: "https://x/y.jpg",
  });
});

test("asRoomTrack normalises missing optional fields", () => {
  assert.deepEqual(asRoomTrack({ youtubeId: "abc" }), { youtubeId: "abc", title: "", artist: null, thumbnailUrl: null });
});

test("asRoomTrack rejects junk", () => {
  assert.equal(asRoomTrack(null), null);
  assert.equal(asRoomTrack("abc"), null);
  assert.equal(asRoomTrack({ title: "no id" }), null);
  assert.equal(asRoomTrack({ youtubeId: "" }), null);
});
