/** Shared types for user-saved (AI / concierge) playlists. Client + server. */

/** Minimal track payload when creating/adding (thumbnail is derived from videoId). */
export interface PlaylistTrackInput {
  videoId: string;
  title: string;
  artist: string | null;
}

/** A persisted playlist track row. */
export interface UserPlaylistTrack extends PlaylistTrackInput {
  id: string;
  position: number;
}

/** A playlist row for the index grid. */
export interface PlaylistSummary {
  id: string;
  name: string;
  mood: string | null;
  trackCount: number;
  /** First track's derived thumbnail, for the cover. */
  cover: string | null;
  createdAt: string;
}

/** A playlist plus its ordered tracks. */
export interface UserPlaylist {
  id: string;
  name: string;
  mood: string | null;
  createdAt: string;
  tracks: UserPlaylistTrack[];
}

/** Stable YouTube thumbnail for a video id (playlist_tracks stores no thumbnail). */
export function ytThumb(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
