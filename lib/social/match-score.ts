/**
 * Pure, dependency-free taste-matching scorer. Genre overlap leads (works day
 * one off signup prefs); shared listening history is a bounded bonus on top —
 * mirrors lib/rooms/suggestion-plan.ts's "no app imports" precedent so it can
 * be unit tested without a database.
 */

const GENRE_WEIGHT = 0.7;
const TRACK_WEIGHT = 0.3;
const ADJACENCY_CREDIT = 0.5; // a same-family genre counts as half a match
const SHARED_TRACK_CAP = 10; // more than this many shared tracks stops adding value

export interface MatchInput {
  genresA: string[];
  genresB: string[];
  sharedTrackCount: number;
  familyOf: (value: string) => string | undefined;
}

function genreOverlapScore(
  genresA: string[],
  genresB: string[],
  familyOf: (value: string) => string | undefined,
): number {
  const setA = new Set(genresA);
  const setB = new Set(genresB);
  if (setA.size === 0 || setB.size === 0) return 0;

  const familiesA = new Set(
    [...setA].map(familyOf).filter((f): f is string => Boolean(f)),
  );

  let matched = 0;
  for (const g of setB) {
    if (setA.has(g)) {
      matched += 1;
    } else {
      const f = familyOf(g);
      if (f && familiesA.has(f)) matched += ADJACENCY_CREDIT;
    }
  }

  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : matched / union;
}

/** 0..1-ish score (can exceed 1 slightly via the track bonus; callers only compare/sort it). */
export function scoreMatch(input: MatchInput): number {
  const genreScore = genreOverlapScore(input.genresA, input.genresB, input.familyOf);
  const trackBonus =
    Math.min(input.sharedTrackCount, SHARED_TRACK_CAP) / SHARED_TRACK_CAP;
  return genreScore * GENRE_WEIGHT + trackBonus * TRACK_WEIGHT;
}

export interface CandidateInput {
  userId: string;
  genres: string[];
  sharedTrackCount: number;
}

export interface RankedCandidate {
  userId: string;
  score: number;
}

export function rankCandidates(
  candidates: CandidateInput[],
  limit: number,
  ctx: { viewerGenres: string[]; familyOf: (value: string) => string | undefined },
): RankedCandidate[] {
  return candidates
    .map((c) => ({
      userId: c.userId,
      score: scoreMatch({
        genresA: ctx.viewerGenres,
        genresB: c.genres,
        sharedTrackCount: c.sharedTrackCount,
        familyOf: ctx.familyOf,
      }),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, limit));
}
