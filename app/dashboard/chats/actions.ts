"use server";

import { getCurrentProfile } from "@/lib/auth/profile";
import {
  getOrCreateDmConversation,
  createGroupConversation,
  sendMessage,
  getMessageById,
  markRead,
} from "@/lib/chats/store";
import { logPlayAction } from "@/lib/social/actions";
import type { ChatMessage, SendMessageInput } from "@/lib/chats/types";

export async function startDmAction(
  otherUserId: string,
): Promise<{ ok: boolean; conversationId?: string }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false };
  const id = await getOrCreateDmConversation(profile.id, otherUserId);
  return id ? { ok: true, conversationId: id } : { ok: false };
}

export async function startGroupAction(
  participantIds: string[],
  name: string,
): Promise<{ ok: boolean; conversationId?: string }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false };
  const id = await createGroupConversation(profile.id, participantIds, name);
  return id ? { ok: true, conversationId: id } : { ok: false };
}

export async function sendMessageAction(
  conversationId: string,
  input: SendMessageInput,
): Promise<{ ok: boolean; message?: ChatMessage }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false };
  const message = await sendMessage(conversationId, profile.id, input);
  return message ? { ok: true, message } : { ok: false };
}

export async function markReadAction(conversationId: string): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) return;
  await markRead(conversationId, profile.id);
}

/**
 * Called when a shared-track card is played from inside a thread. Logs the
 * play for the listener; Plan 3 extends this to also award the original
 * sender points when they aren't the one playing it.
 */
export async function trackSharePlayedAction(messageId: string): Promise<void> {
  const message = await getMessageById(messageId);
  if (!message || message.kind !== "track" || !message.track) return;
  await logPlayAction(message.track, "chat");
}
