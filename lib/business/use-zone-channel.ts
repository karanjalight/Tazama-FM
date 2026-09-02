"use client";

/**
 * Realtime backbone for a Zone Room — deliberately lighter than
 * `lib/rooms/use-room-channel.ts`: presence + reactions + a "queue changed"
 * ping, isolated directly from the pieces of `useRoomChannel` that don't
 * depend on a broadcasting host. Playback sync itself is NOT this hook's
 * job — a zone-room joiner subscribes to `useZonePlayback`
 * (`lib/business/use-branch-playback.ts`) for that, over Postgres Changes,
 * exactly like the kiosk already does; there's no host here to broadcast
 * ticks or answer a sync-request, so those pieces of `useRoomChannel` are
 * dropped entirely rather than adapted.
 */
import * as React from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { ROOM_EVENT, zoneChannelName, type QueuePayload, type ReactionPayload } from "@/lib/rooms/channel";
import type { Participant, RoomViewer } from "@/lib/rooms/types";

interface PresenceMeta {
  user_id: string;
  name: string;
  avatar_key: string | null;
  genres: string[];
}

export interface ZoneChannelHandlers {
  onReaction?: (r: ReactionPayload) => void;
  onQueuePing?: (p: QueuePayload) => void;
}

export interface ZoneChannelApi {
  connected: boolean;
  participants: Participant[];
  sendReaction: (r: ReactionPayload) => void;
  sendQueuePing: () => void;
}

/**
 * `joined: false` (the kiosk's use case — see `kiosk-room-player.tsx`)
 * still wires up the broadcast listeners, it just never calls
 * `channel.track()`, so the caller receives reactions/queue-pings without
 * ever appearing in the participant list itself.
 */
export function useZoneChannel({
  zoneId,
  viewer,
  joined,
  enabled = true,
  handlers,
}: {
  zoneId: string;
  viewer: RoomViewer;
  joined: boolean;
  /** Matches `useZonePlayback`'s own always-called-but-conditionally-enabled
   * convention (same file's kiosk caller has no zone at all for a non-zone
   * room, so `zoneId` may be `""` — this must be a real no-op then, not a
   * channel literally named "zone:"). */
  enabled?: boolean;
  handlers: ZoneChannelHandlers;
}): ZoneChannelApi {
  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const [connected, setConnected] = React.useState(false);
  const [participants, setParticipants] = React.useState<Participant[]>([]);

  const hRef = React.useRef(handlers);
  React.useEffect(() => {
    hRef.current = handlers;
  });

  React.useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    const channel = supabase.channel(zoneChannelName(zoneId), {
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
            isHost: false,
          });
        }
        list.sort((a, b) => a.name.localeCompare(b.name));
        setParticipants(list);
      })
      .on("broadcast", { event: ROOM_EVENT.reaction }, ({ payload }) =>
        hRef.current.onReaction?.(payload as ReactionPayload),
      )
      .on("broadcast", { event: ROOM_EVENT.queue }, ({ payload }) =>
        hRef.current.onQueuePing?.(payload as QueuePayload),
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      setConnected(false);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [zoneId, viewer.id, enabled]);

  React.useEffect(() => {
    const channel = channelRef.current;
    if (!channel || !connected) return;
    if (joined) {
      channel.track({
        user_id: viewer.id,
        name: viewer.name,
        avatar_key: viewer.avatarKey,
        genres: viewer.genres,
      } satisfies PresenceMeta);
    } else {
      channel.untrack();
    }
  }, [connected, joined, viewer]);

  const send = React.useCallback((event: string, payload: unknown) => {
    channelRef.current?.send({ type: "broadcast", event, payload });
  }, []);

  return {
    connected,
    participants,
    sendReaction: (r) => send(ROOM_EVENT.reaction, r),
    sendQueuePing: () => send(ROOM_EVENT.queue, { at: Date.now() } as QueuePayload),
  };
}
