import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeGenres,
  parseVibeCompletion,
  buildVibeSystemPrompt,
  type VibeGenre,
} from "./vibe-match";

const CATALOG: VibeGenre[] = [
  { value: "afrobeats", label: "Afrobeats" },
  { value: "amapiano", label: "Amapiano" },
  { value: "gengetone", label: "Gengetone" },
  { value: "benga", label: "Benga" },
];

test("sanitizeGenres keeps only values present in the catalog", () => {
  assert.deepEqual(
    sanitizeGenres(["afrobeats", "not-a-real-genre", "amapiano"], CATALOG),
    ["afrobeats", "amapiano"],
  );
});

test("sanitizeGenres de-dupes while preserving first-seen order", () => {
  assert.deepEqual(
    sanitizeGenres(["afrobeats", "afrobeats", "amapiano"], CATALOG),
    ["afrobeats", "amapiano"],
  );
});

test("sanitizeGenres caps at max", () => {
  const out = sanitizeGenres(
    ["afrobeats", "amapiano", "gengetone", "benga"],
    CATALOG,
    2,
  );
  assert.equal(out.length, 2);
  assert.deepEqual(out, ["afrobeats", "amapiano"]);
});

test("sanitizeGenres returns [] for non-array input", () => {
  assert.deepEqual(sanitizeGenres("afrobeats", CATALOG), []);
  assert.deepEqual(sanitizeGenres(null, CATALOG), []);
  assert.deepEqual(sanitizeGenres(undefined, CATALOG), []);
});

test("sanitizeGenres skips non-string items without throwing", () => {
  assert.deepEqual(
    sanitizeGenres(["afrobeats", 42, null, "amapiano"], CATALOG),
    ["afrobeats", "amapiano"],
  );
});

test("sanitizeGenres trims surrounding whitespace before matching", () => {
  assert.deepEqual(
    sanitizeGenres([" afrobeats ", "amapiano\n"], CATALOG),
    ["afrobeats", "amapiano"],
  );
});

test("buildVibeSystemPrompt lists every catalog entry and states the cap", () => {
  const prompt = buildVibeSystemPrompt(CATALOG, 2);
  assert.ok(prompt.includes("afrobeats: Afrobeats"));
  assert.ok(prompt.includes("benga: Benga"));
  assert.ok(prompt.includes("at most 2 genres"));
});

test("parseVibeCompletion returns genres + note on a valid completion", () => {
  const result = parseVibeCompletion(
    JSON.stringify({
      genres: ["afrobeats", "amapiano"],
      note: "Upbeat, all-day energy.",
    }),
    CATALOG,
  );
  assert.deepEqual(result, {
    genres: ["afrobeats", "amapiano"],
    note: "Upbeat, all-day energy.",
  });
});

test("parseVibeCompletion returns null on invalid JSON", () => {
  assert.equal(parseVibeCompletion("not json", CATALOG), null);
});

test("parseVibeCompletion returns null when nothing survives catalog validation", () => {
  assert.equal(
    parseVibeCompletion(
      JSON.stringify({ genres: ["not-a-real-genre"], note: "x" }),
      CATALOG,
    ),
    null,
  );
});

test("parseVibeCompletion defaults note to empty string when missing", () => {
  const result = parseVibeCompletion(
    JSON.stringify({ genres: ["afrobeats"] }),
    CATALOG,
  );
  assert.deepEqual(result, { genres: ["afrobeats"], note: "" });
});

test("parseVibeCompletion returns null when the JSON top level is an array, not an object", () => {
  assert.equal(parseVibeCompletion("[1,2]", CATALOG), null);
});

test("parseVibeCompletion truncates an overlong note to 200 chars", () => {
  const longNote = "x".repeat(500);
  const result = parseVibeCompletion(
    JSON.stringify({ genres: ["afrobeats"], note: longNote }),
    CATALOG,
  );
  assert.equal(result?.note.length, 200);
});
