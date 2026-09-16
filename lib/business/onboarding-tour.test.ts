import { test } from "node:test";
import assert from "node:assert/strict";

import {
  TOUR_VERSION,
  chapterSegments,
  chapterStartIndex,
  nextTourMeta,
  parseTourMeta,
  shouldAutoLaunch,
  stepsForRole,
  type TourStep,
} from "./onboarding-tour";
import { TOUR_STEPS } from "./onboarding-tour-steps";

const step = (id: string, chapter: TourStep["chapter"], extra: Partial<TourStep> = {}): TourStep => ({
  id,
  chapter,
  title: id,
  body: `${id} body`,
  targets: [],
  illustration: "welcome",
  ...extra,
});

const STEPS: TourStep[] = [
  step("welcome", "welcome"),
  step("a", "setup"),
  step("b", "setup"),
  step("c", "play"),
  step("team", "grow", { roles: ["owner", "admin"] }),
  step("finish", "finish", { managerBody: "manager copy" }),
];

test("stepsForRole keeps every step for owners and admins", () => {
  assert.equal(stepsForRole(STEPS, "owner").length, 6);
  assert.equal(stepsForRole(STEPS, "admin").length, 6);
});

test("stepsForRole drops role-restricted steps and swaps in manager copy", () => {
  const steps = stepsForRole(STEPS, "manager");
  assert.deepEqual(steps.map((s) => s.id), ["welcome", "a", "b", "c", "finish"]);
  assert.equal(steps.at(-1)?.body, "manager copy");
  assert.equal(STEPS.at(-1)?.body, "finish body", "source steps are not mutated");
});

test("chapterStartIndex finds a chapter's first step, 0 when absent", () => {
  assert.equal(chapterStartIndex(STEPS, "play"), 3);
  assert.equal(chapterStartIndex(STEPS, "measure"), 0);
});

test("chapterSegments marks done/current/upcoming and omits welcome + finish", () => {
  assert.deepEqual(
    chapterSegments(STEPS, 2).map((s) => [s.chapter, s.state]),
    [["setup", "current"], ["play", "upcoming"], ["grow", "upcoming"]],
  );
  assert.deepEqual(chapterSegments(STEPS, 0).map((s) => s.state), ["upcoming", "upcoming", "upcoming"]);
  assert.deepEqual(chapterSegments(STEPS, 5).map((s) => s.state), ["done", "done", "done"]);
  assert.equal(chapterSegments(STEPS, 1)[0].label, "Set up");
});

test("parseTourMeta accepts only well-formed metadata", () => {
  const ok = { version: 1, status: "skipped", at: "2026-09-16T10:00:00.000Z" };
  assert.deepEqual(parseTourMeta(ok), ok);
  for (const bad of [
    null,
    undefined,
    "x",
    {},
    { version: "1", status: "completed", at: "t" },
    { version: 1, status: "maybe", at: "t" },
    { version: 1, status: "completed" },
  ]) {
    assert.equal(parseTourMeta(bad), null);
  }
});

test("shouldAutoLaunch: dashboard only, and only when this version is unhandled", () => {
  const handled = { version: TOUR_VERSION, status: "skipped" as const, at: "t" };
  assert.equal(shouldAutoLaunch({ meta: null, pathname: "/business/dashboard" }), true);
  assert.equal(shouldAutoLaunch({ meta: null, pathname: "/business/branches" }), false);
  assert.equal(shouldAutoLaunch({ meta: handled, pathname: "/business/dashboard" }), false);
  assert.equal(
    shouldAutoLaunch({ meta: { ...handled, version: TOUR_VERSION - 1 }, pathname: "/business/dashboard" }),
    true,
  );
});

test("nextTourMeta writes first results and upgrades, never downgrades a completion", () => {
  const now = "2026-09-16T12:00:00.000Z";
  const completed = { version: TOUR_VERSION, status: "completed" as const, at: "t" };
  const skipped = { version: TOUR_VERSION, status: "skipped" as const, at: "t" };
  assert.deepEqual(nextTourMeta(null, "skipped", now), { version: TOUR_VERSION, status: "skipped", at: now });
  assert.equal(nextTourMeta(completed, "skipped", now), null);
  assert.equal(nextTourMeta(completed, "completed", now), null);
  assert.equal(nextTourMeta(skipped, "skipped", now), null);
  assert.deepEqual(nextTourMeta(skipped, "completed", now), { version: TOUR_VERSION, status: "completed", at: now });
  assert.deepEqual(
    nextTourMeta({ ...completed, version: TOUR_VERSION - 1 }, "skipped", now),
    { version: TOUR_VERSION, status: "skipped", at: now },
  );
});

test("TOUR_STEPS: unique ids, welcome first, finish last, every middle step spotlights something", () => {
  const ids = TOUR_STEPS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(TOUR_STEPS[0].chapter, "welcome");
  assert.equal(TOUR_STEPS.at(-1)?.chapter, "finish");
  for (const s of TOUR_STEPS.slice(1, -1)) {
    assert.ok(s.targets.length > 0, `${s.id} has targets`);
    assert.ok(s.where && s.where.length > 0, `${s.id} has a where breadcrumb`);
  }
  assert.equal(stepsForRole(TOUR_STEPS, "owner").length, 17);
  assert.equal(stepsForRole(TOUR_STEPS, "manager").length, 16);
});
