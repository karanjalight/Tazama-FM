/**
 * Pure queue math for the player. No React, no side effects — easy to reason
 * about in isolation.
 *
 * The queue is held in natural order; a separate **play order** (a permutation
 * of queue indices) decides what plays next. Shuffle off → `[0,1,2,…]`; shuffle
 * on → the current track first, then the rest shuffled. A cursor (`orderPos`)
 * walks the play order; the live queue index is `order[orderPos]`.
 */

export type Repeat = "off" | "one" | "all";

/**
 * Build a play order over `length` items.
 * - shuffle off: identity `[0..length-1]`.
 * - shuffle on: `startIndex` pinned first, the remaining indices shuffled
 *   (Fisher–Yates), so the current track keeps playing and nothing repeats
 *   until the bag is exhausted.
 */
export function buildOrder(
  length: number,
  shuffle: boolean,
  startIndex: number,
): number[] {
  const all = Array.from({ length }, (_, i) => i);
  if (!shuffle || length <= 1) return all;

  const rest = all.filter((i) => i !== startIndex);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [startIndex, ...rest];
}

/**
 * Next cursor position when advancing.
 * Returns `null` when playback should stop — i.e. at the tail with repeat off.
 * Repeat-one is handled by the caller for *auto*-advance (it replays in place);
 * a manual "next" coerces it to repeat-all so the user can always skip on.
 */
export function nextOrderPos(
  pos: number,
  length: number,
  repeat: Repeat,
): number | null {
  if (length === 0) return null;
  if (pos < length - 1) return pos + 1;
  return repeat === "all" ? 0 : null; // at the tail
}

/**
 * Previous cursor position. Wraps to the tail under repeat-all; clamps at 0
 * otherwise. (Restarting the current track when scrubbed past a few seconds is
 * the player's job, not this function's.)
 */
export function prevOrderPos(pos: number, length: number, repeat: Repeat): number {
  if (pos > 0) return pos - 1;
  return repeat === "all" ? Math.max(length - 1, 0) : 0;
}

/** Cycle order for the repeat button: off → all → one → off. */
export function nextRepeat(repeat: Repeat): Repeat {
  return repeat === "off" ? "all" : repeat === "all" ? "one" : "off";
}
