/**
 * Shared types for Pair with a Screen (`/pair/[deviceSlug]`). Safe on client
 * + server.
 */
import type { RoomTrack } from "@/lib/rooms/types";
import type { ScheduleContentSnapshot } from "@/lib/business/schedule-types";

/** Which playback authority is driving a room right now — the kiosk's own
 * priority: an active schedule session, else a synchronized audio zone, else
 * the room itself. */
export type PairSourceKind = "schedule" | "zone" | "room";

export interface PairSource {
  kind: PairSourceKind;
  id: string;
}

export interface PairDevice {
  id: string;
  slug: string;
  name: string;
  kind: "screen" | "audio";
  roomId: string | null;
  roomName: string | null;
  branchName: string | null;
}

export interface PairNowPlaying {
  track: RoomTrack | null;
  positionMs: number;
  isPlaying: boolean;
  /** Epoch ms `positionMs` was true at — same contract as `PlaybackPayload.at`. */
  at: number;
  /** Null when the catalog doesn't know the track's length yet. */
  durationMs: number | null;
  requestedByName: string | null;
}

export interface PairRequest {
  id: string;
  track: RoomTrack;
  addedByName: string | null;
  mine: boolean;
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
}

/** What plays after the requests run out. */
export type PairUpcoming =
  | { kind: "tracks"; tracks: RoomTrack[] }
  | { kind: "mix"; label: string }
  | { kind: "none" };

export interface PairState {
  source: PairSource;
  nowPlaying: PairNowPlaying;
  /** Schedule signage currently on screen (never set for zone/room sources). */
  content: ScheduleContentSnapshot | null;
  requests: PairRequest[];
  upcoming: PairUpcoming;
  /** False when no device in the room has checked in recently. */
  screenOnline: boolean;
}
