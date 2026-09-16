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
}

export function asRoomTrack(value: unknown): PairTrackShape | null {
  if (!value || typeof value !== "object") return null;
  const t = value as Record<string, unknown>;
  if (typeof t.youtubeId !== "string" || !t.youtubeId) return null;
  return {
    youtubeId: t.youtubeId,
    title: typeof t.title === "string" ? t.title : "",
    artist: typeof t.artist === "string" ? t.artist : null,
    thumbnailUrl: typeof t.thumbnailUrl === "string" ? t.thumbnailUrl : null,
  };
}
