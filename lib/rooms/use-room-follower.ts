"use client";

import * as React from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import {
  ROOM_EVENT,
  roomChannelName,
  type PlaybackPayload,
} from "@/lib/rooms/channel";

/**
 * A read-only follower of a room's realtime playback — for the public kiosk
 * screen (`/player/<room>`). Unlike `useRoomChannel` it tracks **no presence**
 * (so a TV in the corner doesn't show up as a listener or inflate the count)
 * and only listens for the host's `playback` broadcasts.
 *
 * On connect it fires a `sync-request`, which the host answers by re-broadcasting
 * its current state — so the screen snaps into sync the moment it loads, and
 * again whenever `requestSync()` is called (e.g. after the user resumes).
 *
 * Works with the anonymous Supabase client: the room broadcast channel isn't a
 * private channel, so no auth is required to subscribe.
 */
export function useRoomFollower(
  roomId: string,
  onPlayback: (p: PlaybackPayload) => void,
): { connected: boolean; requestSync: () => void } {
  const cbRef = React.useRef(onPlayback);
  React.useEffect(() => {
    cbRef.current = onPlayback;
  });

  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const [connected, setConnected] = React.useState(false);

  const sendSync = React.useCallback(() => {
    channelRef.current?.send({
      type: "broadcast",
      event: ROOM_EVENT.syncRequest,
      payload: {},
    });
  }, []);

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(roomChannelName(roomId), {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel
      .on("broadcast", { event: ROOM_EVENT.playback }, ({ payload }) =>
        cbRef.current(payload as PlaybackPayload),
      )
      .subscribe((status) => {
        const ok = status === "SUBSCRIBED";
        setConnected(ok);
        if (ok) sendSync(); // ask the host to re-broadcast so we sync now
      });

    return () => {
      setConnected(false);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, sendSync]);

  return { connected, requestSync: sendSync };
}
