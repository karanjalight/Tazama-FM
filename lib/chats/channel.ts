/** Realtime broadcast contract for a conversation thread — mirrors lib/rooms/channel.ts. */
import type { ChatMessage } from "./types";

export const CHAT_EVENT = { message: "message" } as const;

export interface MessagePayload {
  message: ChatMessage;
}

export function conversationChannelName(conversationId: string): string {
  return `conversation:${conversationId}`;
}
