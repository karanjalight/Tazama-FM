/**
 * Pure decision logic for a business playlist in `continuous` playback mode —
 * which kind of song plays next (a saved song, a fresh genre song, or an
 * AI-picked complement), which specific song within that kind, and when the
 * hidden mix pool needs topping up. No network or DB access and no app
 * imports, so it's testable with `node --test` via a standalone tsc build
 * (same convention as lib/business/vibe-match.ts). The server side lives in
 * lib/business/playlist-resolver.ts + lib/business/playlist-mix-pool.ts.
 */

export type MixSource = "saved" | "genre" | "ai";

export interface MixItem {
  youtubeId: string;
  /** ISO timestamp of the last time this song actually started playing. */
  lastPlayedAt: string | null;
  /** Tie-break for never-played songs — a saved song's playlist position, a
   * pool song's insertion order. */
  order: number;
}

const HOUR_MS = 60 * 60 * 1000;

/** Max rows in one playlist's mix pool — least-recently-played keeps cycling
 * through it once full, so it never needs to grow without bound. */
export const MIX_POOL_CAP = 200;
const GENRE_FRESH_MIN = 10;
const AI_FRESH_MIN = 5;
const GENRE_REFRESH_MS = 2 * HOUR_MS;
/** AI refills resolve each named song with a YouTube search (~100 quota
 * units apiece), so they're throttled far harder than genre refills. */
const AI_REFRESH_MS = 24 * HOUR_MS;
/** A pool song not played within this window counts as "fresh" again. */
const FRESH_WINDOW_MS = 24 * HOUR_MS;

const WEIGHTS: Record<MixSource, number> = { saved: 0.5, genre: 0.25, ai: 0.25 };
const SOURCES: MixSource[] = ["saved", "genre", "ai"];

/**
 * Which source the next song comes from. A fresh (genre/AI) song is always
 * followed by a saved one when any exist, so the playlist's own songs stay
 * the anchor; otherwise it's a weighted draw (50% saved / 25% genre / 25% AI)
 * renormalized over the sources that actually have something to play.
 * `roll` is a number in [0, 1) — injected so the draw is testable.
 */
export function chooseMixSource(input: {
  current: MixSource | null;
  counts: Record<MixSource, number>;
  roll: number;
}): MixSource | null {
  const available = SOURCES.filter((s) => input.counts[s] > 0);
  if (!available.length) return null;

  if ((input.current === "genre" || input.current === "ai") && input.counts.saved > 0) {
    return "saved";
  }

  const total = available.reduce((sum, s) => sum + WEIGHTS[s], 0);
  let threshold = 0;
  for (const source of available) {
    threshold += WEIGHTS[source] / total;
    if (input.roll < threshold) return source;
  }
  return available[available.length - 1];
}

function playedAtMs(item: MixItem): number {
  return item.lastPlayedAt ? Date.parse(item.lastPlayedAt) : Number.NEGATIVE_INFINITY;
}

/** Never-played songs first (in `order`), then the one played longest ago.
 * Never returns the currently-playing song. */
export function pickLeastRecentlyPlayed<T extends MixItem>(
  items: T[],
  excludeYoutubeId: string | null,
): T | null {
  let best: T | null = null;
  for (const item of items) {
    if (item.youtubeId === excludeYoutubeId) continue;
    if (!best) {
      best = item;
      continue;
    }
    const a = playedAtMs(item);
    const b = playedAtMs(best);
    if (a < b || (a === b && item.order < best.order)) best = item;
  }
  return best;
}

/** Full next-song decision: works out the current song's source, draws the
 * next source over what's actually playable (excluding the current song),
 * then picks least-recently-played within it. Null = nothing playable. */
export function resolveMixPick<T extends MixItem>(input: {
  currentYoutubeId: string | null;
  bySource: Record<MixSource, T[]>;
  roll: number;
}): { source: MixSource; item: T } | null {
  const { currentYoutubeId, bySource } = input;
  const current =
    currentYoutubeId === null
      ? null
      : (SOURCES.find((s) => bySource[s].some((i) => i.youtubeId === currentYoutubeId)) ?? null);

  const counts = {} as Record<MixSource, number>;
  for (const s of SOURCES) {
    counts[s] = bySource[s].filter((i) => i.youtubeId !== currentYoutubeId).length;
  }

  const source = chooseMixSource({ current, counts, roll: input.roll });
  if (!source) return null;
  const item = pickLeastRecentlyPlayed(bySource[source], currentYoutubeId);
  return item ? { source, item } : null;
}

/** Whether the mix pool should be topped up from genres and/or AI right now. */
export function mixRefillNeeds(input: {
  genresCount: number;
  savedCount: number;
  pool: { source: "genre" | "ai"; lastPlayedAt: string | null }[];
  genreRefreshedAt: string | null;
  aiRefreshedAt: string | null;
  now: number;
}): { genre: boolean; ai: boolean } {
  if (input.pool.length >= MIX_POOL_CAP) return { genre: false, ai: false };

  const isFresh = (lastPlayedAt: string | null) =>
    lastPlayedAt === null || input.now - Date.parse(lastPlayedAt) > FRESH_WINDOW_MS;
  const freshGenre = input.pool.filter((p) => p.source === "genre" && isFresh(p.lastPlayedAt)).length;
  const freshAi = input.pool.filter((p) => p.source === "ai" && isFresh(p.lastPlayedAt)).length;
  const due = (refreshedAt: string | null, intervalMs: number) =>
    refreshedAt === null || input.now - Date.parse(refreshedAt) >= intervalMs;

  return {
    genre: input.genresCount > 0 && freshGenre < GENRE_FRESH_MIN && due(input.genreRefreshedAt, GENRE_REFRESH_MS),
    ai:
      (input.savedCount > 0 || input.genresCount > 0) &&
      freshAi < AI_FRESH_MIN &&
      due(input.aiRefreshedAt, AI_REFRESH_MS),
  };
}
