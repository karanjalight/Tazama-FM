/**
 * Pure position-freeze math for `setBranchPlayback`. The kiosk mirrors
 * room_playback by computing `positionMs + (isPlaying ? now - updatedAt : 0)`
 * — so pausing must snapshot the estimated live position into `positionMs`,
 * or a subsequent resume (or a late-joining kiosk) computes from a stale 0.
 */
export function computeFrozenPosition(
  current: { positionMs: number; isPlaying: boolean; updatedAt: string } | null,
  nextIsPlaying: boolean,
  now: number,
): number {
  let positionMs = current?.positionMs ?? 0;
  if (!nextIsPlaying && current?.isPlaying) {
    // Clamp the elapsed delta itself (not the final sum) so clock skew that
    // makes `now` precede `updatedAt` can't erase a legitimate positionMs.
    const elapsed = Math.max(0, now - new Date(current.updatedAt).getTime());
    positionMs = positionMs + elapsed;
  }
  return positionMs;
}
