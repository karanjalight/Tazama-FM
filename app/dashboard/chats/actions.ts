"use server";

import { getCurrentProfile } from "@/lib/auth/profile";
import {
  getOrCreateDmConversation,
  createGroupConversation,
  sendMessage,
  getMessageById,
  isParticipant,
  markRead,
} from "@/lib/chats/store";
import { searchUsersByName, type UserSummary } from "@/lib/social/discovery";
import { onTrackShared, onSharedTrackPlayed } from "@/lib/gamification/store";
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
  if (!message) return { ok: false };
  if (message.kind === "track") {
    await onTrackShared(profile.id, message.id);
  }
  return { ok: true, message };
}

export async function markReadAction(conversationId: string): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) return;
  await markRead(conversationId, profile.id);
}

/**
 * Called when a shared-track card is played from inside a thread. The play
 * itself is already logged by the player's own play() callback (source:
 * "dashboard") — this only awards the original sender points when someone
 * else played their shared track.
 */
export async function trackSharePlayedAction(messageId: string): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) return;
  const message = await getMessageById(messageId);
  if (!message || message.kind !== "track" || !message.track) return;
  if (!(await isParticipant(message.conversationId, profile.id))) return;
  if (profile.id !== message.senderId) {
    await onSharedTrackPlayed(message.senderId, messageId);
  }
}

export async function searchUsersAction(query: string): Promise<UserSummary[]> {
  const profile = await getCurrentProfile();
  if (!profile) return [];
  return searchUsersByName(query, profile.id);
}
