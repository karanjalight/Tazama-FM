/**
 * Validates a `track` jsonb value read back from the database. Import-free
 * (structurally identical to `RoomTrack` in lib/rooms/types.ts, which can't be
 * imported here without breaking the standalone `node --test` compile).
 */
export interface PairTrackShape {
  youtubeId: string;
  title: string;
  artist: string | null;
  thumbnailUrl: string | null;
  requestedByName?: string | null;
}

export function asRoomTrack(value: unknown): PairTrackShape | null {
  if (!value || typeof value !== "object") return null;
  const t = value as Record<string, unknown>;
  if (typeof t.youtubeId !== "string" || !t.youtubeId) return null;
  const track: PairTrackShape = {
    youtubeId: t.youtubeId,
    title: typeof t.title === "string" ? t.title : "",
    artist: typeof t.artist === "string" ? t.artist : null,
    thumbnailUrl: typeof t.thumbnailUrl === "string" ? t.thumbnailUrl : null,
  };
  if (typeof t.requestedByName === "string" && t.requestedByName) track.requestedByName = t.requestedByName;
  return track;
}

/** The track a claimed request plays as — carries the requester's name so the
 * screen and every paired phone can credit them straight off the playback
 * row. Blank names fall back to a generic credit. */
export function withRequestCredit(track: PairTrackShape, addedByName: string | null): PairTrackShape {
  const name = addedByName?.trim();
  return { ...track, requestedByName: name ? name : "a guest" };
}
