/**
 * Taste-aware suggestion engine. SERVER ONLY.
 *
 * The room's "up next" pool is built from the COLLECTIVE taste of whoever is in
 * the room: each participant's saved (curated) genre preferences are weighted by
 * how many people share them, blended with the room's own genre tags. Curated
 * genres are served straight from the cached catalog; room tags fall back to a
 * live YouTube search so the big catalog still contributes.
 */
import { getCachedTracksByGenre } from "@/lib/tracks";
import { searchTracks } from "@/lib/youtube/search";
import { GENRE_VALUES, genreLabel } from "@/lib/genres";
import { roomGenreLabel } from "@/lib/room-genres";
import type { RoomTrack } from "@/lib/rooms/types";

export interface SuggestionInput {
  /** Curated genre values (from participants' preferences), most-shared first. */
  curatedGenres: string[];
  /** Room tag values (big catalog) for extra colour. */
  roomGenres: string[];
  /** youtubeIds already played or queued — never suggest these. */
  exclude: string[];
  limit?: number;
}

function dedupe(tracks: RoomTrack[], exclude: Set<string>): RoomTrack[] {
  const seen = new Set(exclude);
  const out: RoomTrack[] = [];
  for (const t of tracks) {
    if (!t.youtubeId || seen.has(t.youtubeId)) continue;
    seen.add(t.youtubeId);
    out.push(t);
  }
  return out;
}

/** Round-robin across the per-genre buckets so the mix stays varied. */
function interleave(buckets: RoomTrack[][]): RoomTrack[] {
  const out: RoomTrack[] = [];
  const longest = Math.max(0, ...buckets.map((b) => b.length));
  for (let i = 0; i < longest; i++) {
    for (const b of buckets) if (b[i]) out.push(b[i]);
  }
  return out;
}

export async function buildSuggestions(
  input: SuggestionInput,
): Promise<RoomTrack[]> {
  const limit = input.limit ?? 24;
  const exclude = new Set(input.exclude);

  // 1. Curated genres → cached catalog (cheap, already seeded).
  const curated = [...new Set(input.curatedGenres)].filter((g) =>
    GENRE_VALUES.includes(g),
  );
  const curatedBuckets = await Promise.all(
    curated.slice(0, 5).map(async (g) => {
      const tracks = await getCachedTracksByGenre(g, 10);
      return tracks.map<RoomTrack>((t) => ({
        youtubeId: t.youtubeId,
        title: t.title,
        artist: t.artist,
        thumbnailUrl: t.thumbnailUrl,
      }));
    }),
  );

  let buckets = curatedBuckets;

  // 2. If we don't have much, let the room tags pull fresh tracks live.
  const have = buckets.reduce((n, b) => n + b.length, 0);
  if (have < limit) {
    const tags = [...new Set(input.roomGenres)].slice(0, 2);
    const tagBuckets = await Promise.all(
      tags.map(async (tag) => {
        try {
          const hits = await searchTracks(`${roomGenreLabel(tag)} music`, 8);
          return hits.map<RoomTrack>((h) => ({
            youtubeId: h.youtubeId,
            title: h.title,
            artist: h.artist,
            thumbnailUrl: h.thumbnailUrl,
          }));
        } catch {
          return [] as RoomTrack[];
        }
      }),
    );
    buckets = [...buckets, ...tagBuckets];
  }

  return dedupe(interleave(buckets), exclude).slice(0, limit);
}

/**
 * Rank curated genre VALUES by how many participants share them, so the most
 * popular taste in the room leads the suggestions. Pure — runs on the client too.
 */
export function rankGenresByPopularity(genreLists: string[][]): string[] {
  const tally = new Map<string, number>();
  for (const list of genreLists) {
    for (const g of new Set(list)) tally.set(g, (tally.get(g) ?? 0) + 1);
  }
  return [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);
}

export { genreLabel };
