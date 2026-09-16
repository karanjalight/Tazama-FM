/**
 * Pure logic for AI song generation on the business side — the Groq prompt,
 * validating what the model returns, and assembling resolved songs into a
 * list that meets a song-count or real-duration target. No network calls and
 * no `@/` imports (testable with `node --test` via a standalone tsc build,
 * like ./vibe-match.ts). The server orchestration lives in
 * lib/business/ai-song-generator.ts.
 */
import { sanitizeGenres } from "./vibe-match";

export interface AiSongGenre {
  value: string;
  label: string;
}

export interface AiSongQuery {
  title: string;
  artist: string;
}

export interface AiSongsCompletion {
  tracks: AiSongQuery[];
  genres: string[];
  note: string;
}

export type SongTarget =
  | { kind: "count"; count: number }
  | { kind: "duration"; seconds: number };

export type GeneratedSongSource = "ai" | "genre";

/** Shared with the dialog's textarea and the action's validation. */
export const MAX_PROMPT_LENGTH = 300;
/** Upper bound on songs the model names per call — each one that isn't
 * already cached costs a YouTube search, so this bounds quota per click. */
export const MAX_NAMED_SONGS = 25;
export const MAX_SUGGESTED_GENRES = 3;
/** AI generations allowed per business per rolling 24 hours. */
export const AI_DAILY_LIMIT = 30;
const MAX_TITLE_LENGTH = 150;
const MAX_ARTIST_LENGTH = 120;
const MAX_NOTE_LENGTH = 200;
const MAX_SEEDS_IN_PROMPT = 20;

export function buildAiSongsSystemPrompt(opts: {
  catalog: AiSongGenre[];
  count: number;
  /** True when the user picked no genres — the model also picks up to 3. */
  suggestGenres: boolean;
}): string {
  const genreRule = opts.suggestGenres
    ? `- Also pick 1 to ${MAX_SUGGESTED_GENRES} genres from the CATALOG that match the request, using only its "value" strings.`
    : `- Leave "genres" as an empty array.`;
  return `You are Tazama's music programmer for businesses (cafés, restaurants, shops, gyms, hotels). A staff member describes the music they want playing in their venue. Suggest real, well-known, commercially released songs that fit.

Rules:
- Suggest exactly ${opts.count} different songs. Only real songs by their real artists — never invent one.
- Keep the flow varied: avoid more than 2 songs by the same artist.
- Keep it venue-appropriate: no explicit or offensive tracks.
- If existing songs are listed, suggest songs that fit alongside them and don't repeat any of them.
${genreRule}
- Reply with ONLY a JSON object, no other text: {"note": "one short sentence describing the selection", "genres": ["value"], "tracks": [{"title": "Song title", "artist": "Artist name"}]}.

CATALOG (value: label):
${opts.catalog.map((g) => `${g.value}: ${g.label}`).join("\n")}`;
}

export function buildAiSongsUserMessage(opts: {
  prompt: string;
  genreLabels: string[];
  seeds: AiSongQuery[];
}): string {
  const lines = [`Request: ${opts.prompt.trim() || "Songs that fit this playlist."}`];
  if (opts.genreLabels.length) lines.push(`Genres: ${opts.genreLabels.join(", ")}`);
  if (opts.seeds.length) {
    lines.push("Existing songs:");
    for (const s of opts.seeds.slice(0, MAX_SEEDS_IN_PROMPT)) {
      lines.push(`- ${s.artist} — ${s.title}`);
    }
  }
  return lines.join("\n");
}

/** The part of a song title worth searching the catalog for — bracketed
 * extras ("(Remix)", "[Live]") removed, unless that leaves nothing. */
export function catalogTitleQuery(title: string): string {
  const core = title.replace(/[([][^)\]]*[)\]]/g, " ").replace(/\s+/g, " ").trim();
  return core.length >= 2 ? core : title.trim();
}

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** "Master KG feat. Nomcebo" → "Master KG". */
function leadArtist(artist: string): string {
  return artist.split(/\s+(?:feat\.?|ft\.?|featuring|x|&|and|with)\s+|,/i)[0]?.trim() ?? "";
}

/**
 * Find an AI-named song among catalog rows (found by a title search) before
 * spending a YouTube search on it. Catalog titles are YouTube titles
 * ("Master KG - Jerusalema [Feat. Nomcebo] (Official Music Video)") and the
 * artist is the channel, so a match needs the core title as whole words AND
 * the lead artist in either the channel name or the title — a cover or
 * lyrics channel with the same song title doesn't count.
 */
export function pickCatalogMatch<T extends { youtubeId: string; title: string; artist: string | null }>(
  candidates: T[],
  query: AiSongQuery,
): T | null {
  const core = normalizeForMatch(catalogTitleQuery(query.title));
  const lead = normalizeForMatch(leadArtist(query.artist));
  if (!core || !lead) return null;
  for (const candidate of candidates) {
    const title = ` ${normalizeForMatch(candidate.title)} `;
    if (!title.includes(` ${core} `)) continue;
    const artist = ` ${normalizeForMatch(candidate.artist ?? "")} `;
    if (artist.includes(` ${lead} `) || title.includes(` ${lead} `)) return candidate;
  }
  return null;
}

function cleanString(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Parse + validate a Groq JSON-mode completion. Null when no usable songs came back. */
export function parseAiSongsCompletion(
  content: string,
  catalog: AiSongGenre[],
  maxTracks: number,
): AiSongsCompletion | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const { tracks: rawTracks, genres: rawGenres, note: rawNote } = parsed as {
    tracks?: unknown;
    genres?: unknown;
    note?: unknown;
  };

  const tracks: AiSongQuery[] = [];
  const seen = new Set<string>();
  if (Array.isArray(rawTracks)) {
    for (const entry of rawTracks) {
      if (tracks.length >= maxTracks) break;
      if (!entry || typeof entry !== "object") continue;
      const title = cleanString((entry as { title?: unknown }).title, MAX_TITLE_LENGTH);
      const artist = cleanString((entry as { artist?: unknown }).artist, MAX_ARTIST_LENGTH);
      if (!title || !artist) continue;
      const key = `${artist.toLowerCase()}|${title.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      tracks.push({ title, artist });
    }
  }
  if (!tracks.length) return null;

  return {
    tracks,
    genres: sanitizeGenres(rawGenres, catalog, MAX_SUGGESTED_GENRES),
    note: cleanString(rawNote, MAX_NOTE_LENGTH),
  };
}

/**
 * Combine resolved AI songs and genre songs into one list that meets
 * `target`. AI songs are what was asked for, so they're selected first and
 * genre songs only top up the rest; the selection is then ordered so AI
 * picks are spread evenly through the genre songs (a 4-hour session doesn't
 * front-load every AI pick into its first hour). Duplicates and anything in
 * `exclude` (songs already in the list) are dropped.
 *
 * - `count`: N songs.
 * - `duration`: songs with a known length, added until their real total
 *   covers the target — so overshoot is always less than one song.
 */
export function assembleSongs<T extends { youtubeId: string; durationSeconds: number | null }>(input: {
  ai: T[];
  genre: T[];
  target: SongTarget;
  exclude?: Iterable<string>;
}): { songs: { item: T; source: GeneratedSongSource }[]; totalSeconds: number } {
  const seen = new Set<string>(input.exclude ?? []);
  const dedupe = (list: T[]) =>
    list.filter((t) => (seen.has(t.youtubeId) ? false : (seen.add(t.youtubeId), true)));
  // AI first, so a song both lists found counts as an AI pick.
  const ai = dedupe(input.ai);
  const genre = dedupe(input.genre);

  const pickedAi: T[] = [];
  const pickedGenre: T[] = [];
  let totalSeconds = 0;

  if (input.target.kind === "count") {
    const n = Math.max(0, input.target.count);
    pickedAi.push(...ai.slice(0, n));
    pickedGenre.push(...genre.slice(0, n - pickedAi.length));
    for (const t of [...pickedAi, ...pickedGenre]) totalSeconds += t.durationSeconds ?? 0;
  } else if (input.target.seconds > 0) {
    const targetSeconds = input.target.seconds;
    const take = (list: T[], into: T[]) => {
      for (const t of list) {
        if (totalSeconds >= targetSeconds) return;
        if (t.durationSeconds == null || t.durationSeconds <= 0) continue;
        into.push(t);
        totalSeconds += t.durationSeconds;
      }
    };
    take(ai, pickedAi);
    take(genre, pickedGenre);
  }

  const songs: { item: T; source: GeneratedSongSource }[] = [];
  let a = 0;
  let g = 0;
  while (a < pickedAi.length || g < pickedGenre.length) {
    // Emit whichever list is proportionally furthest behind.
    const aiProgress = (a + 0.5) / pickedAi.length;
    const genreProgress = (g + 0.5) / pickedGenre.length;
    if (a < pickedAi.length && (g >= pickedGenre.length || aiProgress <= genreProgress)) {
      songs.push({ item: pickedAi[a++], source: "ai" });
    } else {
      songs.push({ item: pickedGenre[g++], source: "genre" });
    }
  }
  return { songs, totalSeconds };
}
