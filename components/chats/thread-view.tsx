"use client";

import * as React from "react";

import { MessageBubble } from "@/components/chats/message-bubble";
import { Composer } from "@/components/chats/composer";
import { useConversationChannel } from "@/lib/chats/use-conversation-channel";
import { sendMessageAction, markReadAction } from "@/app/dashboard/chats/actions";
import type { ChatMessage } from "@/lib/chats/types";

export function ThreadView({
  conversationId,
  viewerId,
  initialMessages,
  blocked,
}: {
  conversationId: string;
  viewerId: string;
  initialMessages: ChatMessage[];
  blocked: boolean;
}) {
  const [messages, setMessages] = React.useState(initialMessages);
  const bottomRef = React.useRef<HTMLDivElement | null>(null);

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

  return (
    <div className="flex h-[calc(100svh-8rem)] flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} isOwn={m.senderId === viewerId} />
        ))}
        <div ref={bottomRef} />
      </div>
      {blocked ? (
        <p className="border-t border-border p-4 text-center text-sm text-muted-foreground">
          This conversation is unavailable.
        </p>
      ) : (
        <Composer onSend={handleSend} />
      )}
    </div>
  );
}
