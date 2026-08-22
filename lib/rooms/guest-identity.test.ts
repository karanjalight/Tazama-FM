import { test } from "node:test";
import assert from "node:assert/strict";
import {
  signGuestCookieValue,
  verifyGuestCookieValue,
  randomGuestId,
} from "./guest-identity";

test("randomGuestId always produces a guest-prefixed id", () => {
  assert.match(randomGuestId(), /^guest-[0-9a-f-]{36}$/);
});

test("randomGuestId never repeats across calls", () => {
  assert.notEqual(randomGuestId(), randomGuestId());
});

test("verifyGuestCookieValue accepts a value signGuestCookieValue produced", () => {
  const id = randomGuestId();
  const signed = signGuestCookieValue(id);
  assert.equal(verifyGuestCookieValue(signed), id);
});

test("verifyGuestCookieValue rejects a tampered id with a stale signature", () => {
  const original = signGuestCookieValue(randomGuestId());
  const [, signature] = original.split(".");
  const forged = `guest-00000000-0000-0000-0000-000000000000.${signature}`;
  assert.equal(verifyGuestCookieValue(forged), null);
});

test("verifyGuestCookieValue rejects a value with no signature separator", () => {
  assert.equal(verifyGuestCookieValue("guest-not-signed-at-all"), null);
});

test("verifyGuestCookieValue rejects an id not prefixed with guest-", () => {
  const forged = signGuestCookieValue("guest-victim").replace(
    "guest-victim",
    "not-a-guest-id",
  );
  assert.equal(verifyGuestCookieValue(forged), null);
});
