/**
 * Seed the `tracks` catalog for every genre — straight from your terminal.
 *
 *   npm run seed:tracks
 *
 * Doubles as a setup diagnostic: it tells you exactly which piece is missing
 * (env var, table, or a YouTube API that isn't enabled) instead of failing
 * silently the way the dashboard would.
 *
 * Reads .env.local via Node's --env-file (see the npm script). Uses the
 * service-role key, so it bypasses RLS to write the shared catalog — keep that
 * key out of client code.
 */
import { createClient } from "@supabase/supabase-js";

// Keep in sync with lib/genres.ts (value + YouTube query).
const GENRES = [
  { value: "afrobeats", query: "afrobeats hits" },
  { value: "amapiano", query: "amapiano hits" },
  { value: "bongo", query: "bongo flava hits" },
  { value: "gengetone", query: "gengetone hits" },
  { value: "hip-hop", query: "hip hop hits" },
  { value: "rnb", query: "r&b hits" },
  { value: "gospel", query: "gospel music hits" },
  { value: "reggae-dancehall", query: "reggae dancehall hits" },
  { value: "pop", query: "pop hits" },
  { value: "drill", query: "drill music hits" },
  { value: "benga", query: "benga music kenya" },
  { value: "rhumba", query: "rhumba congolese hits" },
];
const TARGET = 12;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const YT_KEY = process.env.YOUTUBE_API_KEY;

function fail(msg, hint) {
  console.error(`\n✖ ${msg}`);
  if (hint) console.error(`  → ${hint}`);
  process.exit(1);
}

// ── Preflight: required configuration ───────────────────────────────────────
if (!SUPABASE_URL)
  fail("NEXT_PUBLIC_SUPABASE_URL is missing in .env.local");
if (!SERVICE_KEY)
  fail(
    "SUPABASE_SERVICE_ROLE_KEY is missing in .env.local",
    "Supabase dashboard → Project Settings → API → 'service_role' secret.",
  );
if (!YT_KEY) fail("YOUTUBE_API_KEY is missing in .env.local");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Preflight: does the tracks table exist? ─────────────────────────────────
{
  const { error } = await supabase.from("tracks").select("id").limit(1);
  if (error) {
    fail(
      `Can't read public.tracks (${error.message})`,
      "Run supabase/schema.sql in the Supabase SQL editor first.",
    );
  }
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function searchGenre(genre) {
  const params = new URLSearchParams({
    key: YT_KEY,
    part: "snippet",
    q: genre.query,
    type: "video",
    videoEmbeddable: "true",
    videoSyndicated: "true",
    videoCategoryId: "10",
    safeSearch: "moderate",
    maxResults: String(TARGET),
  });
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params}`,
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} — ${body.slice(0, 220)}`);
  }
  const json = await res.json();
  const out = [];
  const seen = new Set();
  for (const item of json.items ?? []) {
    const id = item?.id?.videoId;
    const title = item?.snippet?.title;
    if (!id || !title || seen.has(id)) continue;
    seen.add(id);
    const thumbs = item?.snippet?.thumbnails ?? {};
    out.push({
      youtube_id: id,
      title: decodeEntities(title),
      artist: item?.snippet?.channelTitle
        ? decodeEntities(item.snippet.channelTitle)
        : null,
      genre: genre.value,
      thumbnail_url:
        thumbs.high?.url ?? thumbs.medium?.url ?? thumbs.default?.url ?? null,
      is_playable: true,
    });
  }
  return out;
}

console.log(`Seeding ${GENRES.length} genres (target ${TARGET} each)…\n`);

let total = 0;
let failures = 0;
let sawServiceBlocked = false;

for (const genre of GENRES) {
  process.stdout.write(`• ${genre.value.padEnd(18)} `);
  try {
    const rows = await searchGenre(genre);
    if (rows.length === 0) {
      console.log("0 results");
      continue;
    }
    const { error } = await supabase
      .from("tracks")
      .upsert(rows, { onConflict: "youtube_id", ignoreDuplicates: true });
    if (error) {
      console.log(`DB error: ${error.message}`);
      failures++;
      continue;
    }
    total += rows.length;
    console.log(`✓ ${rows.length} tracks`);
  } catch (err) {
    failures++;
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`✖ ${msg}`);
    if (msg.includes("API_KEY_SERVICE_BLOCKED") || msg.includes("403")) {
      sawServiceBlocked = true;
    }
  }
}

console.log(
  `\nDone — ${total} rows upserted, ${failures} genre(s) failed.`,
);

if (sawServiceBlocked) {
  console.error(
    "\n⚠ YouTube returned 403 API_KEY_SERVICE_BLOCKED. Enable the API for your project:\n" +
      "  https://console.cloud.google.com/apis/library/youtube.googleapis.com\n" +
      "  Then check the key's API restrictions (Credentials → your key) include 'YouTube Data API v3'.",
  );
}

process.exit(failures ? 1 : 0);
