"use client";

import * as React from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import {
  ROOM_EVENT,
  roomChannelName,
  type PlaybackPayload,
  type QueuePayload,
  type ReactionPayload,
} from "@/lib/rooms/channel";
import type { Participant, RoomViewer } from "@/lib/rooms/types";

interface PresenceMeta {
  user_id: string;
  name: string;
  avatar_key: string | null;
  genres: string[];
  is_host: boolean;
}

export interface RoomChannelHandlers {
  onPlayback?: (p: PlaybackPayload) => void;
  onQueuePing?: (p: QueuePayload) => void;
  onReaction?: (r: ReactionPayload) => void;
  /** Host listens for this to re-broadcast its current state to late-joiners. */
  onSyncRequest?: () => void;
}

export interface RoomChannelApi {
  connected: boolean;
  participants: Participant[];
  sendPlayback: (p: PlaybackPayload) => void;
  sendQueuePing: () => void;
  sendReaction: (r: ReactionPayload) => void;
  requestSync: () => void;
}

/**
 * Realtime backbone for a room: Presence (who's here + their taste) plus
 * Broadcast for playback ticks, queue pings and reactions. Announces the viewer
 * only once `joined` is true (so the lobby can observe before committing).
 */
export function useRoomChannel({
  roomId,
  viewer,
  isHost,
  joined,
  handlers,
}: {
  roomId: string;
  viewer: RoomViewer;
  isHost: boolean;
  joined: boolean;
  handlers: RoomChannelHandlers;
}): RoomChannelApi {
  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const [connected, setConnected] = React.useState(false);
  const [participants, setParticipants] = React.useState<Participant[]>([]);

  const hRef = React.useRef(handlers);
  React.useEffect(() => {
    hRef.current = handlers;
  });

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(roomChannelName(roomId), {
      config: {
        presence: { key: viewer.id },
        broadcast: { self: false },
      },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceMeta>();
        const list: Participant[] = [];
        const seen = new Set<string>();
        for (const key of Object.keys(state)) {
          const meta = state[key]?.[0];
          if (!meta || seen.has(meta.user_id)) continue;
          seen.add(meta.user_id);
          list.push({
            userId: meta.user_id,
            name: meta.name,
            avatarKey: meta.avatar_key,
            genres: meta.genres ?? [],
            isHost: meta.is_host,
          });
        }
        // Host first, then alphabetical — stable ordering for the avatar stack.
        list.sort((a, b) =>
          a.isHost === b.isHost ? a.name.localeCompare(b.name) : a.isHost ? -1 : 1,
        );
        setParticipants(list);
      })
      .on("broadcast", { event: ROOM_EVENT.playback }, ({ payload }) =>
        hRef.current.onPlayback?.(payload as PlaybackPayload),
      )
      .on("broadcast", { event: ROOM_EVENT.queue }, ({ payload }) =>
        hRef.current.onQueuePing?.(payload as QueuePayload),
      )
      .on("broadcast", { event: ROOM_EVENT.reaction }, ({ payload }) =>
        hRef.current.onReaction?.(payload as ReactionPayload),
      )
      .on("broadcast", { event: ROOM_EVENT.syncRequest }, () =>
        hRef.current.onSyncRequest?.(),
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      setConnected(false);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, viewer.id]);

  // Announce / withdraw presence as the viewer joins or leaves.
  React.useEffect(() => {
    const channel = channelRef.current;
    if (!channel || !connected) return;
    if (joined) {
      channel.track({
        user_id: viewer.id,
        name: viewer.name,
        avatar_key: viewer.avatarKey,
        genres: viewer.genres,
        is_host: isHost,
      } satisfies PresenceMeta);
    } else {
      channel.untrack();
    }
  }, [connected, joined, isHost, viewer]);

  const send = React.useCallback(
    (event: string, payload: unknown) => {
      channelRef.current?.send({ type: "broadcast", event, payload });
    },
    [],
  );

  return {
    connected,
    participants,
    sendPlayback: (p) => send(ROOM_EVENT.playback, p),
    sendQueuePing: () => send(ROOM_EVENT.queue, { at: Date.now() } as QueuePayload),
    sendReaction: (r) => send(ROOM_EVENT.reaction, r),
    requestSync: () => send(ROOM_EVENT.syncRequest, {}),
  };
}
