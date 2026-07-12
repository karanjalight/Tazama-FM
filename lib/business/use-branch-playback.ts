"use client";

/**
 * Branch-specific playback plumbing. A consumer room advances because a human
 * host's browser broadcasts `playback` events on the room's realtime channel
 * (`useRoomFollower`) — a branch has no host tab, so it needs two different
 * things instead:
 *
 *  1. `useBranchPlayback` subscribes to Postgres Changes on `room_playback`
 *     (already in the `supabase_realtime` publication, per `rooms.sql`)
 *     instead of a broadcast, so both this branch's own `/advance` writes and
 *     a staff member's manual "play now" push reach the kiosk the same way.
 *  2. `requestAdvance` asks `/api/business/branches/advance` what plays next
 *     and returns it as a `PlaybackPayload` ready to hand to the same
 *     `applyHostPayload` pipeline the consumer-room mirror already uses.
 */
import * as React from "react";

import { createClient } from "@/lib/supabase/client";
import type { PlaybackPayload } from "@/lib/rooms/channel";
import type { RoomTrack } from "@/lib/rooms/types";

interface RoomPlaybackRow {
  track: RoomTrack | null;
  position_ms: number;
  is_playing: boolean;
  updated_at: string;
}

function rowToPayload(row: RoomPlaybackRow): PlaybackPayload {
  return {
    track: row.track,
    positionMs: row.position_ms,
    isPlaying: row.is_playing,
    at: new Date(row.updated_at).getTime(),
  };
}

export function useBranchPlayback(
  roomId: string,
  enabled: boolean,
  onPlayback: (p: PlaybackPayload) => void,
): void {
  const cbRef = React.useRef(onPlayback);
  React.useEffect(() => {
    cbRef.current = onPlayback;
  });

  React.useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`branch-playback:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_playback",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const row = payload.new as RoomPlaybackRow | undefined;
          if (row) cbRef.current(rowToPayload(row));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, enabled]);
}

/** Ask the server for the next track and shape it as a PlaybackPayload the
 * kiosk can apply immediately (the postgres_changes subscription above will
 * also see the same write, but applying it here avoids waiting a round trip). */
export async function requestAdvance(
  slug: string,
): Promise<PlaybackPayload | null> {
  try {
    const res = await fetch("/api/business/branches/advance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    const data = (await res.json()) as { track?: RoomTrack | null };
    if (!data.track) return null;
    return {
      track: data.track,
      positionMs: 0,
      isPlaying: true,
      at: Date.now(),
    };
  } catch {
    return null;
  }
}

interface BranchVolumeRow {
  volume: number;
}

/** Subscribes to a branch's own `volume` column so a remote admin change
 * (Task 6/7) reaches an already-loaded kiosk immediately. Filters by
 * `room_id` (not `branches.id`) since the kiosk only knows its room's id. */
export function useBranchVolume(
  roomId: string,
  enabled: boolean,
  onVolume: (volume: number) => void,
): void {
  const cbRef = React.useRef(onVolume);
  React.useEffect(() => {
    cbRef.current = onVolume;
  });

  React.useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`branch-volume:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "branches",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const row = payload.new as BranchVolumeRow | undefined;
          if (row && typeof row.volume === "number") cbRef.current(row.volume);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, enabled]);
}
