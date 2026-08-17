/**
 * Maps a scroll container's `scrollTop` to the index of the fully-snapped
 * card, clamped to `[0, maxIndex]`. Used by the discovery feed to decide
 * which card has settled after the user stops scrolling.
 */
export function settledIndex(
  scrollTop: number,
  cardHeight: number,
  maxIndex: number,
): number {
  if (cardHeight <= 0 || maxIndex < 0) return 0;
  const raw = Math.round(scrollTop / cardHeight);
  return Math.min(Math.max(raw, 0), maxIndex);
}
