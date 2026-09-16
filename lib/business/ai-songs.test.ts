import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseAiSongsCompletion,
  assembleSongs,
  buildAiSongsSystemPrompt,
  buildAiSongsUserMessage,
  pickCatalogMatch,
  catalogTitleQuery,
  type AiSongGenre,
} from "./ai-songs";

const CATALOG: AiSongGenre[] = [
  { value: "afrobeats", label: "Afrobeats" },
  { value: "amapiano", label: "Amapiano" },
  { value: "gengetone", label: "Gengetone" },
];

function song(id: string, durationSeconds: number | null = 200) {
  return { youtubeId: id, durationSeconds };
}

test("parse: keeps valid tracks, trims, drops malformed entries", () => {
  const out = parseAiSongsCompletion(
    JSON.stringify({
      note: "  Warm brunch picks. ",
      tracks: [
        { title: " Essence ", artist: "Wizkid" },
        { title: "", artist: "Nobody" },
        { title: "No artist" },
        "not an object",
        { title: "Calm Down", artist: "Rema" },
      ],
    }),
    CATALOG,
    25,
  );
  assert.ok(out);
  assert.deepEqual(out.tracks, [
    { title: "Essence", artist: "Wizkid" },
    { title: "Calm Down", artist: "Rema" },
  ]);
  assert.equal(out.note, "Warm brunch picks.");
});

test("parse: de-dupes case-insensitively and caps the list", () => {
  const out = parseAiSongsCompletion(
    JSON.stringify({
      tracks: [
        { title: "Essence", artist: "Wizkid" },
        { title: "essence", artist: "WIZKID" },
        { title: "Calm Down", artist: "Rema" },
        { title: "Peru", artist: "Fireboy DML" },
      ],
    }),
    CATALOG,
    2,
  );
  assert.ok(out);
  assert.equal(out.tracks.length, 2);
  assert.deepEqual(out.tracks.map((t) => t.title), ["Essence", "Calm Down"]);
});

test("parse: genres are validated against the catalog", () => {
  const out = parseAiSongsCompletion(
    JSON.stringify({
      genres: ["afrobeats", "made-up", "amapiano"],
      tracks: [{ title: "Essence", artist: "Wizkid" }],
    }),
    CATALOG,
    25,
  );
  assert.ok(out);
  assert.deepEqual(out.genres, ["afrobeats", "amapiano"]);
});

test("parse: invalid JSON or no usable tracks -> null", () => {
  assert.equal(parseAiSongsCompletion("not json", CATALOG, 25), null);
  assert.equal(parseAiSongsCompletion(JSON.stringify({ tracks: [] }), CATALOG, 25), null);
  assert.equal(parseAiSongsCompletion(JSON.stringify([1, 2]), CATALOG, 25), null);
});

test("prompts: include the requested count, seeds and chosen genres", () => {
  const system = buildAiSongsSystemPrompt({ catalog: CATALOG, count: 12, suggestGenres: true });
  assert.match(system, /12/);
  assert.match(system, /afrobeats: Afrobeats/);
  const user = buildAiSongsUserMessage({
    prompt: "Sunday brunch",
    genreLabels: ["Amapiano"],
    seeds: [{ title: "Essence", artist: "Wizkid" }],
  });
  assert.match(user, /Sunday brunch/);
  assert.match(user, /Amapiano/);
  assert.match(user, /Wizkid — Essence/);
});

test("assemble: spreads AI songs evenly through genre songs", () => {
  const { songs } = assembleSongs({
    ai: [song("a1"), song("a2"), song("a3")],
    genre: [song("g1"), song("g2"), song("g3")],
    target: { kind: "count", count: 10 },
  });
  assert.deepEqual(
    songs.map((s) => s.item.youtubeId),
    ["a1", "g1", "a2", "g2", "a3", "g3"],
  );
  assert.deepEqual(
    songs.map((s) => s.source),
    ["ai", "genre", "ai", "genre", "ai", "genre"],
  );
});

test("assemble: selects AI songs first, genre songs only top up", () => {
  const { songs } = assembleSongs({
    ai: [song("a1"), song("a2"), song("a3")],
    genre: [song("g1"), song("g2"), song("g3")],
    target: { kind: "count", count: 4 },
  });
  assert.deepEqual(songs.map((s) => s.item.youtubeId), ["a1", "a2", "g1", "a3"]);
});

test("assemble: removes duplicates and excluded ids", () => {
  const { songs } = assembleSongs({
    ai: [song("a1"), song("x")],
    genre: [song("a1"), song("g1")],
    target: { kind: "count", count: 10 },
    exclude: ["x"],
  });
  assert.deepEqual(songs.map((s) => s.item.youtubeId), ["a1", "g1"]);
});

test("assemble: count target takes exactly N", () => {
  const { songs } = assembleSongs({
    ai: [song("a1"), song("a2"), song("a3")],
    genre: [],
    target: { kind: "count", count: 2 },
  });
  assert.equal(songs.length, 2);
});

test("assemble: duration target stops once the window is covered (overshoot < one song)", () => {
  const { songs, totalSeconds } = assembleSongs({
    ai: [song("a1", 200), song("a2", 200), song("a3", 200), song("a4", 200)],
    genre: [],
    target: { kind: "duration", seconds: 500 },
  });
  assert.equal(songs.length, 3);
  assert.equal(totalSeconds, 600);
});

test("assemble: duration target skips songs with unknown length", () => {
  const { songs, totalSeconds } = assembleSongs({
    ai: [song("a1", null), song("a2", 300)],
    genre: [song("g1", 300)],
    target: { kind: "duration", seconds: 600 },
  });
  assert.deepEqual(songs.map((s) => s.item.youtubeId), ["a2", "g1"]);
  assert.equal(totalSeconds, 600);
});

test("assemble: not enough candidates returns everything usable", () => {
  const { songs, totalSeconds } = assembleSongs({
    ai: [song("a1", 100)],
    genre: [],
    target: { kind: "duration", seconds: 3600 },
  });
  assert.equal(songs.length, 1);
  assert.equal(totalSeconds, 100);
});

test("assemble: a non-positive target returns nothing", () => {
  assert.equal(
    assembleSongs({ ai: [song("a1")], genre: [], target: { kind: "duration", seconds: 0 } }).songs.length,
    0,
  );
  assert.equal(
    assembleSongs({ ai: [song("a1")], genre: [], target: { kind: "count", count: 0 } }).songs.length,
    0,
  );
});

test("catalog match: matches a YouTube-style title by core title + main artist", () => {
  const candidates = [
    { youtubeId: "x1", title: "Jerusalema (Remix)", artist: "Some Cover Channel" },
    { youtubeId: "x2", title: "Master KG - Jerusalema [Feat. Nomcebo] (Official Music Video)", artist: "Master KG" },
  ];
  assert.equal(pickCatalogMatch(candidates, { title: "Jerusalema", artist: "Master KG feat. Nomcebo" })?.youtubeId, "x2");
});

test("catalog match: artist can appear in the title instead of the channel", () => {
  const candidates = [{ youtubeId: "y1", title: "Wizkid - Essence ft. Tems", artist: "StarboyTV" }];
  assert.equal(pickCatalogMatch(candidates, { title: "Essence", artist: "Wizkid & Tems" })?.youtubeId, "y1");
});

test("catalog match: no artist evidence -> no match", () => {
  const candidates = [{ youtubeId: "z1", title: "Essence (Lyrics)", artist: "Lyrics Hub" }];
  assert.equal(pickCatalogMatch(candidates, { title: "Essence", artist: "Wizkid" }), null);
});

test("catalogTitleQuery: strips bracketed parts, keeps a usable core", () => {
  assert.equal(catalogTitleQuery("(Sittin' On) The Dock of the Bay"), "The Dock of the Bay");
  assert.equal(catalogTitleQuery("Umoya [Live]"), "Umoya");
  assert.equal(catalogTitleQuery("(Go)"), "(Go)");
});
