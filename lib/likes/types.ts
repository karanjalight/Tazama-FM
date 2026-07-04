/** Shared types for liked/favorite tracks. Client + server. */

/**
 * Minimal payload to like a track. `videoId` is the YouTube id — the one
 * identity shared by every track shape in the app (catalog `Track.youtubeId`,
 * `PlayerTrack.youtubeId`, live `RoomTrack.youtubeId`, chat `ChatTrack.videoId`).
 */
export interface LikeInput {
  videoId: string;
  title: string;
  artist: string | null;
  thumbnailUrl: string | null;
}

/** A persisted liked-track row. */
export interface LikedTrack extends LikeInput {
  createdAt: string;
}

/** Stable YouTube thumbnail for a video id (fallback when none was stored). */
export function likeThumb(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
