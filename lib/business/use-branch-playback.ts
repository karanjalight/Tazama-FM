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

/** Subscribes to a room's own `volume` column so a remote admin change
 * reaches an already-loaded kiosk immediately. */
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
          table: "rooms",
          filter: `id=eq.${roomId}`,
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

interface ZonePlaybackRow {
  track: RoomTrack | null;
  position_ms: number;
  is_playing: boolean;
  version: number;
  updated_at: string;
}

function rowToZonePayload(row: ZonePlaybackRow): PlaybackPayload {
  return {
    track: row.track,
    positionMs: row.position_ms,
    isPlaying: row.is_playing,
    at: new Date(row.updated_at).getTime(),
  };
}

/** Sibling of `useBranchPlayback` for a synchronized Audio Zone's own
 * canonical playback state (`audio_zone_playback`) instead of a single
 * room's `room_playback`. `onPlayback` also receives the row's `version`
 * so the caller can report it back on the next track-end — see
 * `requestZoneAdvance`'s CAS contract. */
export function useZonePlayback(
  zoneId: string,
  enabled: boolean,
  onPlayback: (p: PlaybackPayload, version: number) => void,
): void {
  const cbRef = React.useRef(onPlayback);
  React.useEffect(() => {
    cbRef.current = onPlayback;
  });

  React.useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`zone-playback:${zoneId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "audio_zone_playback",
          filter: `zone_id=eq.${zoneId}`,
        },
        (payload) => {
          const row = payload.new as ZonePlaybackRow | undefined;
          if (row) cbRef.current(rowToZonePayload(row), row.version);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [zoneId, enabled]);
}

/** Reports the version this kiosk last observed and asks the zone to
 * advance. Mirrors `requestAdvance`, but carries the CAS version — the
 * server only actually advances if `reportedVersion` still matches the
 * zone's current version (first-valid-reporter-wins). Always returns the
 * zone's resulting version so the caller can keep its ref current even
 * when it lost the race. */
export async function requestZoneAdvance(
  zoneId: string,
  reportedVersion: number,
): Promise<{ payload: PlaybackPayload | null; version: number } | null> {
  try {
    const res = await fetch(`/api/business/audio-zones/${zoneId}/advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportedVersion }),
    });
    const data = (await res.json()) as { track?: RoomTrack | null; version?: number };
    if (typeof data.version !== "number") return null;
    return {
      payload: data.track ? { track: data.track, positionMs: 0, isPlaying: true, at: Date.now() } : null,
      version: data.version,
    };
  } catch {
    return null;
  }
}

// ── Schedule override (highest-priority playback source) ───────────────
//
// An active Schedule's own canonical state (`schedule_playback`) — the
// kiosk switches to this instead of useBranchPlayback/useZonePlayback
// whenever /api/business/rooms/[roomId]/active-schedule reports one
// currently covering this room. Both `track` and `content` share one CAS
// `version` — a track-advance and a content-advance landing in the exact
// same instant can race each other (one wins, the other's request is
// dropped as stale); the loser's own next boundary just re-fires the
// advance, so this self-corrects rather than needing two separate locks.

export interface ScheduleContentSnapshot {
  contentItemId: string;
  title: string;
  contentType: "video" | "image" | "audio" | "document";
  url: string | null;
  previewUrl: string | null;
  displaySeconds: number | null;
}

interface SchedulePlaybackRow {
  track: RoomTrack | null;
  content: ScheduleContentSnapshot | null;
  position_ms: number;
  is_playing: boolean;
  /** When the *track* last actually changed — NOT `updated_at`, which also
   * moves on a content-only write (they share this one row). Using
   * `updated_at` here made a content advance a few seconds into a song look
   * like the song had just restarted, since `Date.now() - at` would come out
   * near zero and get hard-seeked back to `position_ms` (effectively 0). */
  started_at: string | null;
  version: number;
  updated_at: string;
}

export function useSchedulePlayback(
  scheduleId: string,
  enabled: boolean,
  onPlayback: (p: PlaybackPayload, content: ScheduleContentSnapshot | null, version: number) => void,
): void {
  const cbRef = React.useRef(onPlayback);
  React.useEffect(() => {
    cbRef.current = onPlayback;
  });

  React.useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`schedule-playback:${scheduleId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "schedule_playback",
          filter: `schedule_id=eq.${scheduleId}`,
        },
        (payload) => {
          const row = payload.new as SchedulePlaybackRow | undefined;
          if (!row) return;
          cbRef.current(
            {
              track: row.track,
              positionMs: row.position_ms,
              isPlaying: row.is_playing,
              at: new Date(row.started_at ?? row.updated_at).getTime(),
            },
            row.content,
            row.version,
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scheduleId, enabled]);
}

export async function requestScheduleAdvance(
  scheduleId: string,
  reportedVersion: number,
): Promise<{ payload: PlaybackPayload | null; version: number; sessionEndsInSeconds: number | null } | null> {
  try {
    const res = await fetch(`/api/business/schedules/${scheduleId}/advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportedVersion }),
    });
    const data = (await res.json()) as {
      track?: RoomTrack | null;
      version?: number;
      noActiveSession?: boolean;
      sessionEndsInSeconds?: number;
    };
    if (typeof data.version !== "number") return null;
    return {
      payload: data.track ? { track: data.track, positionMs: 0, isPlaying: true, at: Date.now() } : null,
      version: data.version,
      sessionEndsInSeconds: data.sessionEndsInSeconds ?? null,
    };
  } catch {
    return null;
  }
}

export async function requestScheduleContentAdvance(
  scheduleId: string,
  reportedVersion: number,
): Promise<{
  content: ScheduleContentSnapshot | null;
  version: number;
  sessionEndsInSeconds: number | null;
  /** Only ever set for a `periodic` session — overrides the usual
   * `content?.displaySeconds ?? NO_CONTENT_RECHECK_SECONDS` arming logic so
   * the "waiting for the next interruption" phase (content: null) still
   * gets checked on time instead of falling all the way back to the
   * 24-hour default. See `resolvePeriodicContent`'s doc comment. */
  contentRecheckInSeconds: number | null;
} | null> {
  try {
    const res = await fetch(`/api/business/schedules/${scheduleId}/advance-content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportedVersion }),
    });
    const data = (await res.json()) as {
      content?: ScheduleContentSnapshot | null;
      version?: number;
      sessionEndsInSeconds?: number;
      contentRecheckInSeconds?: number | null;
    };
    if (typeof data.version !== "number") return null;
    return {
      content: data.content ?? null,
      version: data.version,
      sessionEndsInSeconds: data.sessionEndsInSeconds ?? null,
      contentRecheckInSeconds: data.contentRecheckInSeconds ?? null,
    };
  } catch {
    return null;
  }
}
