"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import { MessageBubble } from "@/components/chats/message-bubble";
import { Composer } from "@/components/chats/composer";
import { ThreadHeader } from "@/components/chats/thread-header";
import { useConversationChannel } from "@/lib/chats/use-conversation-channel";
import {
  sendMessageAction,
  markReadAction,
  uploadVoiceNoteAction,
} from "@/app/dashboard/chats/actions";
import type { ChatMessage, SharedTrack } from "@/lib/chats/types";

export function ThreadView({
  conversationId,
  viewerId,
  initialMessages,
  blocked,
  headerTitle,
  headerSubtitle,
  headerOtherUserId,
  headerAvatarKey,
}: {
  conversationId: string;
  viewerId: string;
  initialMessages: ChatMessage[];
  blocked: boolean;
  headerTitle: string;
  headerSubtitle: string | null;
  headerOtherUserId: string | null;
  headerAvatarKey: string | null;
}) {
  const [messages, setMessages] = React.useState(initialMessages);
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  // Set when a notification click routed here as .../chatId?playVoice=messageId
  // (see public/sw.js's notificationclick handler) — the target message
  // autoplays once it's on screen instead of requiring a manual tap.
  const playVoiceId = useSearchParams().get("playVoice");

  const { sendMessage: broadcast } = useConversationChannel(conversationId, (incoming) => {
    setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
  });

  React.useEffect(() => {
    void markReadAction(conversationId);
  }, [conversationId]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function handleSend(body: string) {
    const res = await sendMessageAction(conversationId, { kind: "text", body });
    if (res.ok && res.message) {
      setMessages((prev) => [...prev, res.message!]);
      broadcast(res.message);
    }
  }

  async function handleShareTrack(track: SharedTrack) {
    const res = await sendMessageAction(conversationId, { kind: "track", track });
    if (res.ok && res.message) {
      setMessages((prev) => [...prev, res.message!]);
      broadcast(res.message);
    }
  }

  async function handleSendVoice(blob: Blob, mimeType: string, durationMs: number) {
    const formData = new FormData();
    formData.set("conversationId", conversationId);
    formData.set("durationMs", String(Math.round(durationMs)));
    formData.set("audio", blob, `voice.${mimeType.includes("ogg") ? "ogg" : "webm"}`);

    const res = await uploadVoiceNoteAction(formData);
    if (res.ok && res.message) {
      setMessages((prev) => [...prev, res.message!]);
      broadcast(res.message);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <ThreadHeader
        title={headerTitle}
        subtitle={headerSubtitle}
        otherUserId={headerOtherUserId}
        avatarKey={headerAvatarKey}
      />
      <div className="flex-1 space-y-2 overflow-y-auto bg-muted/30 p-4">
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            isOwn={m.senderId === viewerId}
            autoPlayVoice={m.id === playVoiceId}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      {blocked ? (
        <p className="border-t border-border bg-background p-4 text-center text-sm text-muted-foreground">
          This conversation is unavailable.
        </p>
      ) : (
        <Composer
          onSend={handleSend}
          onShareTrack={handleShareTrack}
          onSendVoice={handleSendVoice}
        />
      )}
    </div>
  );
}
