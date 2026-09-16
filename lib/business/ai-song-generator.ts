/**
 * Server orchestration for business AI song generation — shared by the
 * "Generate with AI" dialog (via app/business/ai-songs/actions.ts) and the
 * continuous-playlist mix pool refill (lib/business/playlist-mix-pool.ts).
 *
 * Quota shape, deliberately: the model names at most MAX_NAMED_SONGS songs.
 * Each is looked up in the shared `tracks` catalog first (free), then via
 * the cached `resolveTrack` (a YouTube search on a cache miss, ~100 of the
 * app-wide 10k daily units apiece). Anything beyond that — e.g. filling a
 * 4-hour schedule session — comes from genre buckets, where one search
 * yields up to 50 songs for the same ~100 units. SERVER ONLY.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { GENRES, genreLabel } from "@/lib/genres";
import { ensureGenreSeeded, getTrackDurations, rowToTrack, upsertTracksFromYouTube, type Track } from "@/lib/tracks";
import { resolveTrack } from "@/lib/youtube/resolve";
import type { YouTubeTrack } from "@/lib/youtube/search";
import {
  assembleSongs,
  catalogTitleQuery,
  pickCatalogMatch,
  buildAiSongsSystemPrompt,
  buildAiSongsUserMessage,
  parseAiSongsCompletion,
  MAX_NAMED_SONGS,
  type AiSongQuery,
  type GeneratedSongSource,
  type SongTarget,
} from "@/lib/business/ai-songs";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const SONGS_MODEL = "openai/gpt-oss-120b";
const GROQ_TIMEOUT_MS = 30_000;
/** gpt-oss spends completion tokens reasoning before it answers (~1.4k at
 * medium effort for 12 songs, measured) — this leaves room for that plus a
 * 25-song JSON reply. Medium, not low: low effort measurably invented songs
 * and skipped the genre picks. */
const MAX_TOKENS = 6000;
const REASONING_EFFORT = "medium";
/** Used only to estimate how many songs a duration target needs. */
const AVERAGE_SONG_SECONDS = 210;
const MAX_GENRE_DEPTH = 50;

export type GenerateErrorCode = "not_configured" | "ai_not_configured" | "ai_unavailable" | "no_songs";

export interface GeneratedSong {
  track: Track;
  source: GeneratedSongSource;
}

export type AiTracksResult =
  | { ok: true; tracks: Track[]; genres: string[]; note: string }
  | { ok: false; code: GenerateErrorCode };

function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Fills in `durationSeconds` for any track still missing it (cataloged
 * before the column existed) — the read-through `getTrackDurations` also
 * patches the catalog, so this only costs a YouTube call once per track. */
async function withDurations(admin: SupabaseClient, tracks: Track[]): Promise<Track[]> {
  const missing = tracks.filter((t) => t.durationSeconds == null).map((t) => t.id);
  if (!missing.length) return tracks;
  const durations = await getTrackDurations(admin, missing);
  return tracks.map((t) =>
    t.durationSeconds == null && durations.has(t.id) ? { ...t, durationSeconds: durations.get(t.id)! } : t,
  );
}

const CATALOG_CANDIDATES = 10;

/** A named song already in the shared catalog, or null. Free — no YouTube call. */
async function findCatalogTrack(admin: SupabaseClient, query: AiSongQuery): Promise<Track | null> {
  const core = catalogTitleQuery(query.title).replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data, error } = await admin
    .from("tracks")
    .select("*")
    .eq("is_playable", true)
    .ilike("title", `%${core}%`)
    .limit(CATALOG_CANDIDATES);
  if (error || !data?.length) return null;
  const tracks = (data as Parameters<typeof rowToTrack>[0][]).map(rowToTrack);
  return pickCatalogMatch(tracks, query);
}

/** Ask the model for named songs, resolve them to real playable YouTube
 * videos, and catalog them (real `tracks.id` + duration). */
export async function requestAiTracks(
  admin: SupabaseClient,
  input: {
    prompt: string;
    genres: string[];
    seeds: AiSongQuery[];
    count: number;
  },
): Promise<AiTracksResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { ok: false, code: "ai_not_configured" };

  const count = Math.min(Math.max(1, input.count), MAX_NAMED_SONGS);
  let content = "";
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: SONGS_MODEL,
        temperature: 0.6,
        max_tokens: MAX_TOKENS,
        reasoning_effort: REASONING_EFFORT,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: buildAiSongsSystemPrompt({ catalog: GENRES, count, suggestGenres: input.genres.length === 0 }),
          },
          {
            role: "user",
            content: buildAiSongsUserMessage({
              prompt: input.prompt,
              genreLabels: input.genres.map(genreLabel),
              seeds: input.seeds,
            }),
          },
        ],
      }),
      signal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Groq ${res.status}: ${detail.slice(0, 300)}`);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string | null } }[] };
    content = data.choices?.[0]?.message?.content ?? "";
  } catch (err) {
    console.error("requestAiTracks: Groq call failed", err);
    return { ok: false, code: "ai_unavailable" };
  }

  const completion = parseAiSongsCompletion(content, GENRES, count);
  if (!completion) return { ok: false, code: "no_songs" };

  // Catalog first; only songs it doesn't have cost a (cached) YouTube search.
  const resolved = await Promise.all(
    completion.tracks.map(async (query): Promise<Track | YouTubeTrack | null> => {
      const cataloged = await findCatalogTrack(admin, query);
      if (cataloged) return cataloged;
      const hit = await resolveTrack(query.title, query.artist);
      return hit
        ? { youtubeId: hit.videoId, title: hit.title, artist: hit.channelTitle, thumbnailUrl: hit.thumbnail }
        : null;
    }),
  );

  const picks = resolved.filter((r): r is YouTubeTrack => !!r && !("id" in r));
  const inserted = new Map((await upsertTracksFromYouTube(admin, picks)).map((t) => [t.youtubeId, t]));
  const seen = new Set<string>();
  const ordered: Track[] = [];
  for (const r of resolved) {
    const track = r && ("id" in r ? r : inserted.get(r.youtubeId));
    if (!track || seen.has(track.youtubeId)) continue;
    seen.add(track.youtubeId);
    ordered.push(track);
  }

  const tracks = await withDurations(admin, ordered);
  return { ok: true, tracks, genres: completion.genres, note: completion.note };
}

/** Shuffled, deduped songs from the genres' catalog buckets, seeding a
 * bucket from YouTube when it holds fewer than `needed`/genre-count songs. */
export async function genreCandidateTracks(
  admin: SupabaseClient,
  genres: string[],
  needed: number,
): Promise<Track[]> {
  if (!genres.length || needed <= 0) return [];
  const depth = Math.min(MAX_GENRE_DEPTH, Math.max(12, Math.ceil((needed * 1.5) / genres.length)));
  const pools = await Promise.all(genres.map((g) => ensureGenreSeeded(g, depth)));
  const seen = new Set<string>();
  const merged = pools.flat().filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
  return withDurations(admin, shuffle(merged));
}

function estimateSongCount(target: SongTarget): number {
  return target.kind === "count"
    ? Math.max(0, target.count)
    : Math.ceil(Math.max(0, target.seconds) / AVERAGE_SONG_SECONDS) + 2;
}

export type GenerateSongsResult =
  | {
      ok: true;
      songs: GeneratedSong[];
      note: string;
      genresUsed: string[];
      totalSeconds: number;
    }
  | { ok: false; code: GenerateErrorCode };

/**
 * The dialog's full generation: AI-named songs (mode "ai") plus genre songs
 * to top up, assembled to meet `target`. Mode "genres" skips the model
 * entirely (the fallback when AI is unavailable or the daily cap is hit).
 */
export async function generateSongs(
  admin: SupabaseClient,
  input: {
    mode: "ai" | "genres";
    prompt: string;
    genres: string[];
    seeds: AiSongQuery[];
    excludeYoutubeIds: string[];
    target: SongTarget;
  },
): Promise<GenerateSongsResult> {
  const needed = estimateSongCount(input.target);
  if (needed <= 0) return { ok: false, code: "no_songs" };

  let aiTracks: Track[] = [];
  let note = "";
  let genresUsed = input.genres;

  if (input.mode === "ai") {
    // Ask for a few extra: some named songs won't resolve on YouTube.
    const ai = await requestAiTracks(admin, {
      prompt: input.prompt,
      genres: input.genres,
      seeds: input.seeds,
      count: needed + 3,
    });
    if (!ai.ok) return ai;
    aiTracks = ai.tracks;
    note = ai.note;
    if (!genresUsed.length) genresUsed = ai.genres;
  }

  const exclude = new Set(input.excludeYoutubeIds);
  const usableAi = aiTracks.filter((t) => !exclude.has(t.youtubeId));
  const aiSeconds = usableAi.reduce((sum, t) => sum + (t.durationSeconds ?? 0), 0);
  const genreNeeded =
    input.target.kind === "count"
      ? needed - usableAi.length
      : Math.ceil(Math.max(0, input.target.seconds - aiSeconds) / AVERAGE_SONG_SECONDS) + 3;
  const genreTracks = await genreCandidateTracks(admin, genresUsed, genreNeeded);

  const { songs, totalSeconds } = assembleSongs({
    ai: aiTracks,
    genre: genreTracks,
    target: input.target,
    exclude,
  });
  if (!songs.length) return { ok: false, code: "no_songs" };

  return {
    ok: true,
    songs: songs.map((s) => ({ track: s.item, source: s.source })),
    note,
    genresUsed,
    totalSeconds,
  };
}
