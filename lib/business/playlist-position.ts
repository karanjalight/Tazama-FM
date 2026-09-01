/**
 * Pure "what's the next index" math for a playlist cycling continuously
 * (ambient/background music — always wraps, never stops at the end).
 * `currentPosition` is the current track's 0-based index within the
 * already-ordered track list, or null if the current track isn't in this
 * playlist at all (freshly assigned, or first-ever advance).
 */
export function nextPlaylistPosition(
  trackCount: number,
  currentPosition: number | null,
): number {
  if (trackCount <= 0) return 0;
  if (currentPosition === null) return 0;
  return (currentPosition + 1) % trackCount;
}
