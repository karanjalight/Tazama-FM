import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveAdWindow } from "./ad-analytics-types";

test("resolveAdWindow: rolling ranges end today", () => {
  assert.deepEqual(resolveAdWindow("Today", "2026-09-16"), { fromDate: "2026-09-16", toDate: "2026-09-16", days: 1 });
  assert.deepEqual(resolveAdWindow("Last 7 days", "2026-09-16"), { fromDate: "2026-09-10", toDate: "2026-09-16", days: 7 });
  assert.deepEqual(resolveAdWindow("Last 90 days", "2026-09-16"), { fromDate: "2026-06-19", toDate: "2026-09-16", days: 90 });
});

test("resolveAdWindow: calendar windows", () => {
  assert.deepEqual(resolveAdWindow("Yesterday", "2026-03-01"), { fromDate: "2026-02-28", toDate: "2026-02-28", days: 1 });
  assert.deepEqual(resolveAdWindow("This month", "2026-09-16"), { fromDate: "2026-09-01", toDate: "2026-09-16", days: 16 });
  assert.deepEqual(resolveAdWindow("Previous month", "2026-03-10"), { fromDate: "2026-02-01", toDate: "2026-02-28", days: 28 });
  assert.deepEqual(resolveAdWindow("Previous month", "2026-01-05"), { fromDate: "2025-12-01", toDate: "2025-12-31", days: 31 });
});

test("resolveAdWindow: unknown range falls back to 30 days", () => {
  assert.deepEqual(resolveAdWindow("Custom", "2026-09-16"), { fromDate: "2026-08-18", toDate: "2026-09-16", days: 30 });
});
