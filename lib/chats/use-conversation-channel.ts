"use client";

import * as React from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import {
  CHAT_EVENT,
  conversationChannelName,
  type MessagePayload,
} from "@/lib/chats/channel";
import type { ChatMessage } from "@/lib/chats/types";

/**
 * Realtime backbone for one conversation thread: broadcast-only (no presence
 * needed). After a server action persists a message, the sender's own client
 * calls `sendMessage` to push it to everyone else's open thread — mirrors
 * lib/rooms/use-room-channel.ts's send pattern.
 */
export function useConversationChannel(
  conversationId: string,
  onMessage: (message: ChatMessage) => void,
): { sendMessage: (message: ChatMessage) => void } {
  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const onMessageRef = React.useRef(onMessage);
  React.useEffect(() => {
    onMessageRef.current = onMessage;
  });

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(conversationChannelName(conversationId), {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel
      .on("broadcast", { event: CHAT_EVENT.message }, ({ payload }) => {
        onMessageRef.current((payload as MessagePayload).message);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId]);

  const sendMessage = React.useCallback((message: ChatMessage) => {
    channelRef.current?.send({
      type: "broadcast",
      event: CHAT_EVENT.message,
      payload: { message } satisfies MessagePayload,
    });
  }, []);

  return { sendMessage };
}
