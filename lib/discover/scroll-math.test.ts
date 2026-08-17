import { test } from "node:test";
import assert from "node:assert/strict";
import { settledIndex } from "./scroll-math";

test("scrollTop of 0 settles on the first card", () => {
  assert.equal(settledIndex(0, 800, 5), 0);
});

test("scrollTop exactly on a card boundary settles on that card", () => {
  assert.equal(settledIndex(1600, 800, 5), 2);
});

test("scrollTop mid-drag rounds to the nearest card", () => {
  assert.equal(settledIndex(1150, 800, 5), 1); // 1150/800 = 1.4375 -> 1
  assert.equal(settledIndex(1450, 800, 5), 2); // 1450/800 = 1.8125 -> 2
});

test("clamps to maxIndex when scrollTop overshoots (elastic bounce)", () => {
  assert.equal(settledIndex(5000, 800, 5), 5);
});

test("clamps to 0 for a negative scrollTop (elastic bounce at the top)", () => {
  assert.equal(settledIndex(-40, 800, 5), 0);
});

test("returns 0 when cardHeight has not been measured yet", () => {
  assert.equal(settledIndex(500, 0, 5), 0);
});
