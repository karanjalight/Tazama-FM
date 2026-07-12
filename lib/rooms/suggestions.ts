/**
 * Taste-aware suggestion engine. SERVER ONLY.
 *
 * The room's "Up Next" pool is anchored on the ROOM'S OWN genres — a hip-hop
 * room suggests hip-hop. {@link planSuggestions} decides the per-genre slot mix
 * (room genres dominate; members re-weight within them, and a member whose taste
 * is in an adjacent family adds a small, capped nudge). Each planned genre is
 * seeded read-through and served most-viewed-first, then interleaved (room
 * buckets lead) into the final pool.
 */
import { ensureGenreSeeded, type Track } from "@/lib/tracks";
import { genreFamily, genreCacheKey, genreLabel } from "@/lib/genres";
import { planSuggestions } from "@/lib/rooms/suggestion-plan";
import type { RoomTrack } from "@/lib/rooms/types";

export interface SuggestionInput {
  /** The room's tag slugs (host's preset) — the universe of the playlist. */
  roomGenres: string[];
  /** Present members' genre slugs, flat and WITH repeats (for true weighting). */
  participantGenres: string[];
  /** youtubeIds already played or queued — never suggest these. */
  exclude: string[];
  limit?: number;
  /** Share of the pool reserved for room genres (0..1). Default 0.8. */
  anchorShare?: number;
}

/** Pull a few extra per genre so dedupe/exclude can't starve a bucket. */
const OVERFETCH = 3;

function toRoomTrack(t: Track): RoomTrack {
  return {
    youtubeId: t.youtubeId,
    title: t.title,
    artist: t.artist,
    thumbnailUrl: t.thumbnailUrl,
  };
}

interface Bucket {
  kind: "room" | "adjacent";
  slots: number;
  tracks: RoomTrack[];
}

const kindRank = (k: "room" | "adjacent") => (k === "room" ? 0 : 1);

/**
 * Weighted round-robin: room buckets (most-represented first) lead, each
 * contributing up to its `slots` before we backfill from leftovers. Dedupes by
 * youtubeId and skips excluded ids. Pure.
 */
function assembleMix(
  buckets: Bucket[],
  exclude: Set<string>,
  limit: number,
): RoomTrack[] {
  const seen = new Set(exclude);
  const out: RoomTrack[] = [];

  const ordered = [...buckets].sort(
    (a, b) => kindRank(a.kind) - kindRank(b.kind) || b.slots - a.slots,
  );
  const cursor = ordered.map(() => 0);
  const taken = ordered.map(() => 0);

  // Pass 1 — respect the slot shape (proportions per genre).
  let progressed = true;
  while (out.length < limit && progressed) {
    progressed = false;
    for (let bi = 0; bi < ordered.length && out.length < limit; bi++) {
      const b = ordered[bi];
      if (taken[bi] >= b.slots) continue;
      while (cursor[bi] < b.tracks.length) {
        const t = b.tracks[cursor[bi]++];
        if (!t.youtubeId || seen.has(t.youtubeId)) continue;
        seen.add(t.youtubeId);
        out.push(t);
        taken[bi]++;
        progressed = true;
        break;
      }
    }
  }

  // Pass 2 — backfill from leftovers (room first) when buckets ran short.
  for (let bi = 0; bi < ordered.length && out.length < limit; bi++) {
    const b = ordered[bi];
    while (cursor[bi] < b.tracks.length && out.length < limit) {
      const t = b.tracks[cursor[bi]++];
      if (!t.youtubeId || seen.has(t.youtubeId)) continue;
      seen.add(t.youtubeId);
      out.push(t);
    }
  }

  return out.slice(0, limit);
}

export async function buildSuggestions(
  input: SuggestionInput,
): Promise<RoomTrack[]> {
  const limit = input.limit ?? 24;
  const exclude = new Set(input.exclude);

  // Canonicalize so legacy alias slugs (e.g. "hip-hop-rap") and curated slugs
  // ("hip-hop") collapse to one bucket — correct weighting, no double-counting.
  const plan = planSuggestions({
    roomGenres: input.roomGenres.map(genreCacheKey),
    participantGenres: input.participantGenres.map(genreCacheKey),
    familyOf: genreFamily,
    limit,
    anchorShare: input.anchorShare,
  });
  if (plan.length === 0) return [];

  const buckets = await Promise.all(
    plan.map(async (p): Promise<Bucket> => {
      const tracks = await ensureGenreSeeded(
        p.value,
        Math.max(p.slots + OVERFETCH, 6),
      );
      return { kind: p.kind, slots: p.slots, tracks: tracks.map(toRoomTrack) };
    }),
  );

  return assembleMix(buckets, exclude, limit);
}

export { genreLabel };
