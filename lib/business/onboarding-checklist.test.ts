import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildChecklist,
  checklistProgress,
  isChecklistComplete,
  isChecklistVisible,
  parseChecklistDismissedAt,
  type ChecklistCounts,
} from "./onboarding-checklist";

const ZERO: ChecklistCounts = {
  locations: 0,
  connectedScreens: 0,
  playlists: 0,
  contentItems: 0,
  schedules: 0,
  announcements: 0,
  teamMembers: 0,
};

test("buildChecklist: seven items in setup order, done from counts", () => {
  const items = buildChecklist({ ...ZERO, locations: 2, playlists: 1 }, { defaultBranchSlug: "cbd" });
  assert.deepEqual(items.map((i) => i.id), ["location", "screen", "playlist", "content", "schedule", "announcement", "team"]);
  assert.deepEqual(items.filter((i) => i.done).map((i) => i.id), ["location", "playlist"]);
});

test("buildChecklist: branch-scoped links use the default branch, else send you to add one", () => {
  const withBranch = buildChecklist(ZERO, { defaultBranchSlug: "cbd" });
  assert.equal(withBranch.find((i) => i.id === "screen")?.href, "/business/branches/cbd/screens-devices");
  assert.equal(withBranch.find((i) => i.id === "schedule")?.href, "/business/branches/cbd/schedules/new");
  const noBranch = buildChecklist(ZERO, { defaultBranchSlug: null });
  assert.equal(noBranch.find((i) => i.id === "screen")?.href, "/business/branches/new");
  assert.equal(noBranch.find((i) => i.id === "schedule")?.href, "/business/branches/new");
});

test("checklistProgress counts done items", () => {
  const items = buildChecklist({ ...ZERO, locations: 1, teamMembers: 3 }, { defaultBranchSlug: null });
  assert.deepEqual(checklistProgress(items), { done: 2, total: 7 });
});

test("isChecklistVisible: hidden once dismissed or fully done", () => {
  const partial = buildChecklist({ ...ZERO, locations: 1 }, { defaultBranchSlug: "cbd" });
  const full = buildChecklist(
    { locations: 1, connectedScreens: 1, playlists: 1, contentItems: 1, schedules: 1, announcements: 1, teamMembers: 1 },
    { defaultBranchSlug: "cbd" },
  );
  assert.equal(isChecklistVisible(partial, null), true);
  assert.equal(isChecklistVisible(partial, "2026-09-16T10:00:00.000Z"), false);
  assert.equal(isChecklistVisible(full, null), false);
});

test("parseChecklistDismissedAt reads only a string dismissedAt", () => {
  assert.equal(parseChecklistDismissedAt({ dismissedAt: "2026-09-16T10:00:00.000Z" }), "2026-09-16T10:00:00.000Z");
  assert.equal(parseChecklistDismissedAt({ dismissedAt: 5 }), null);
  assert.equal(parseChecklistDismissedAt(null), null);
  assert.equal(parseChecklistDismissedAt("x"), null);
});

test("isChecklistComplete only when every count is above zero", () => {
  const all = { locations: 1, connectedScreens: 2, playlists: 1, contentItems: 4, schedules: 1, announcements: 1, teamMembers: 1 };
  assert.equal(isChecklistComplete(all), true);
  assert.equal(isChecklistComplete({ ...all, teamMembers: 0 }), false);
  assert.equal(isChecklistComplete(ZERO), false);
});
