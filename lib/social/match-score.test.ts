// lib/social/match-score.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreMatch, rankCandidates } from "./match-score";

test("identical genres score higher than disjoint genres", () => {
  const same = scoreMatch({
    genresA: ["hip-hop", "trap"],
    genresB: ["hip-hop", "trap"],
    sharedTrackCount: 0,
    familyOf: () => undefined,
  });
  const different = scoreMatch({
    genresA: ["hip-hop", "trap"],
    genresB: ["classical", "jazz"],
    sharedTrackCount: 0,
    familyOf: () => undefined,
  });
  assert.ok(same > different);
});

test("family-adjacent genres score between identical and disjoint", () => {
  const familyOf = (v: string) => (v === "hip-hop" || v === "trap" ? "rap-family" : undefined);
  const adjacent = scoreMatch({
    genresA: ["hip-hop"],
    genresB: ["trap"],
    sharedTrackCount: 0,
    familyOf,
  });
  const disjoint = scoreMatch({
    genresA: ["hip-hop"],
    genresB: ["classical"],
    sharedTrackCount: 0,
    familyOf,
  });
  const identical = scoreMatch({
    genresA: ["hip-hop"],
    genresB: ["hip-hop"],
    sharedTrackCount: 0,
    familyOf,
  });
  assert.ok(adjacent > disjoint, "adjacent should beat disjoint");
  assert.ok(identical > adjacent, "identical should beat merely adjacent");
});

test("shared tracks add a bounded bonus on top of genre score", () => {
  const withShared = scoreMatch({
    genresA: ["hip-hop"],
    genresB: ["hip-hop"],
    sharedTrackCount: 5,
    familyOf: () => undefined,
  });
  const withoutShared = scoreMatch({
    genresA: ["hip-hop"],
    genresB: ["hip-hop"],
    sharedTrackCount: 0,
    familyOf: () => undefined,
  });
  assert.ok(withShared > withoutShared);
});

test("no overlap at all scores zero", () => {
  const score = scoreMatch({
    genresA: ["hip-hop"],
    genresB: ["classical"],
    sharedTrackCount: 0,
    familyOf: () => undefined,
  });
  assert.equal(score, 0);
});

test("rankCandidates sorts descending and respects the limit", () => {
  const ranked = rankCandidates(
    [
      { userId: "a", genres: ["hip-hop"], sharedTrackCount: 0 },
      { userId: "b", genres: ["hip-hop", "trap"], sharedTrackCount: 3 },
      { userId: "c", genres: ["classical"], sharedTrackCount: 0 },
    ],
    2,
    { viewerGenres: ["hip-hop", "trap"], familyOf: () => undefined },
  );
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].userId, "b");
});
