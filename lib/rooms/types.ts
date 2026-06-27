/**
 * Shared, framework-free types for the Rooms feature. Safe on client + server.
 */
import type { SubscriptionPlan } from "@/lib/billing/plans";

export type RoomAccess = "public" | "private";
export type RoomRole = "host" | "listener";

/** The minimal track shape stored in the queue / playback snapshot (jsonb). */
export interface RoomTrack {
  youtubeId: string;
  title: string;
  artist: string | null;
  thumbnailUrl: string | null;
}

/** A row from `rooms`, mapped to camelCase. */
export interface Room {
  id: string;
  slug: string;
  hostId: string;
  name: string;
  about: string;
  access: RoomAccess;
  genres: string[];
  isLive: boolean;
  createdAt: string;
}

/** A room plus the bits the dashboard cards need (host name + live snapshot). */
export interface RoomSummary extends Room {
  hostName: string;
  listenerCount: number;
  nowPlaying: RoomTrack | null;
}

/** Durable playback snapshot (one per room) used to hydrate late-joiners. */
export interface RoomPlayback {
  roomId: string;
  track: RoomTrack | null;
  positionMs: number;
  isPlaying: boolean;
  listeningMsTotal: number;
  updatedAt: string;
}

/** A queue entry with its computed like count + whether the viewer liked it. */
export interface QueueItem {
  id: string;
  roomId: string;
  track: RoomTrack;
  addedBy: string | null;
  addedByName: string | null;
  likeCount: number;
  likedByMe: boolean;
  played: boolean;
  createdAt: string;
}

/** A live participant, surfaced via Realtime presence. */
export interface Participant {
  userId: string;
  name: string;
  avatarKey: string | null;
  /** The participant's saved genre preferences — fuel for taste-aware picks. */
  genres: string[];
  isHost: boolean;
}

export interface RoomViewer {
  id: string;
  name: string;
  avatarKey: string | null;
  genres: string[];
  plan: SubscriptionPlan;
  accountType: "individual" | "business" | null;
}
