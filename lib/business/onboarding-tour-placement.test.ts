import { test } from "node:test";
import assert from "node:assert/strict";

import { anchorCard } from "./onboarding-tour-placement";

const navRow = (top: number, height = 40) => ({ top, left: 16, width: 256, height });

test("centres the card on the target when there is room", () => {
  assert.deepEqual(anchorCard(navRow(300), 900, 440), { top: 100, left: 316, arrowTop: 220 });
});

test("clamps to the top margin and keeps the arrow inside the card", () => {
  assert.deepEqual(anchorCard(navRow(20), 900, 440), { top: 16, left: 316, arrowTop: 28 });
});

test("clamps to the bottom margin", () => {
  assert.deepEqual(anchorCard(navRow(860, 30), 900, 440), { top: 444, left: 316, arrowTop: 412 });
});

test("a card taller than the viewport pins to the top margin", () => {
  assert.equal(anchorCard(navRow(300), 900, 1000).top, 16);
});

test("never overlaps the sidebar even for narrow targets", () => {
  assert.equal(anchorCard({ top: 300, left: 20, width: 40, height: 40 }, 900, 440).left, 316);
});
