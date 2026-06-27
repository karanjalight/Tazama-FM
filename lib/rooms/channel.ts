/**
 * Realtime channel contract shared by the host broadcaster and every listener.
 * Pure constants + payload types — no Supabase import, safe anywhere.
 *
 * Transport split:
 *  - `playback`  ticks   → low-latency host→listeners sync (broadcast)
 *  - `queue`     pings    → "the queue changed, refetch it" (broadcast)
 *  - `reaction`  events   → ephemeral floating emojis (broadcast)
 *  - presence            → who's in the room + their genre taste
 */
import type { RoomTrack } from "./types";

export const ROOM_EVENT = {
  playback: "playback",
  queue: "queue",
  reaction: "reaction",
  syncRequest: "sync-request",
} as const;

/** Host's authoritative transport state. `at` is the host's Date.now() stamp. */
export interface PlaybackPayload {
  track: RoomTrack | null;
  positionMs: number;
  isPlaying: boolean;
  at: number;
  /** Set when the host has hit the free-tier time cap and stopped. */
  capped?: boolean;
}

/** Tells everyone to refetch the persisted queue (kept tiny on purpose). */
export interface QueuePayload {
  at: number;
}

export interface ReactionPayload {
  emoji: string;
  /** 0–1 horizontal position so reactions don't all stack in one spot. */
  x: number;
  from: string;
}

export const REACTION_EMOJIS = ["❤️", "🔥", "🙌", "😮", "💯", "🕺"] as const;

export function roomChannelName(roomId: string): string {
  return `room:${roomId}`;
}
