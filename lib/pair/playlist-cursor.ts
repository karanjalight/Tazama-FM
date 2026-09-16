/**
 * Pure "where does the playlist pick back up" math for Pair with a Screen.
 * Import-free so it compiles standalone for `node --test`.
 *
 * Every playback row (room / synchronized zone / schedule) carries a nullable
 * `playlist_cursor`: the youtubeId of the last track the source picked for
 * itself. Repeat playlists and schedule song lists compute "next" from a
 * track's index, and a guest request isn't in the playlist — without the
 * cursor, the song after a request would restart the playlist at #1.
 */

/** The track "next in the playlist" is computed from: the saved cursor when a
 * request interrupted the playlist, else whatever's playing (the behaviour
 * every advance path had before requests existed). */
export function cursorBasis(cursor: string | null | undefined, currentYoutubeId: string | null | undefined): string | null {
  return cursor || currentYoutubeId || null;
}

/** The cursor to store after an advance. A request (or any other one-off pick
 * layered over the playlist) keeps the resume point; the playlist's own pick
 * clears it, which restores the exact pre-feature behaviour. */
export function cursorAfterAdvance({
  interruptsPlaylist,
  basisYoutubeId,
}: {
  interruptsPlaylist: boolean;
  basisYoutubeId: string | null;
}): string | null {
  return interruptsPlaylist ? basisYoutubeId : null;
}

/** Indices of the next `count` entries after `basisIndex` in a wrapping
 * playlist (-1 = basis not in the playlist, so preview from the top). Never
 * longer than the playlist itself. */
export function upcomingIndices(length: number, basisIndex: number, count: number): number[] {
  if (length <= 0 || count <= 0) return [];
  const start = basisIndex >= 0 ? basisIndex + 1 : 0;
  return Array.from({ length: Math.min(count, length) }, (_, i) => (start + i) % length);
}
