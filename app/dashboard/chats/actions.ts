"use server";

import { getCurrentProfile } from "@/lib/auth/profile";
import {
  getOrCreateDmConversation,
  createGroupConversation,
  sendMessage,
  getMessageById,
  isParticipant,
  markRead,
  getSenderName,
  countUnreadConversations,
  getConversationSummary,
} from "@/lib/chats/store";
import { searchUsersByName, type UserSummary } from "@/lib/social/discovery";
import { onTrackShared, onSharedTrackPlayed } from "@/lib/gamification/store";
import {
  uploadVoiceNote,
  getVoiceNoteSignedUrl,
  markVoiceNotePlayed,
  listPendingVoiceNotes,
  type PendingVoiceNote,
} from "@/lib/voice/store";
import type { ChatMessage, ConversationSummary, SendMessageInput } from "@/lib/chats/types";

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

/**
 * Upload a recorded voice note and send it as a message, in one action.
 * `isParticipant` is checked before uploading (not just left to sendMessage's
 * own check) so an unauthorized request never burns storage on a file that
 * can't be attached to a message anyway.
 */
export async function uploadVoiceNoteAction(
  formData: FormData,
): Promise<{ ok: boolean; message?: ChatMessage }> {
  const profile = await getCurrentProfile();
  if (!profile) return { ok: false };

  const conversationId = formData.get("conversationId");
  const durationMs = formData.get("durationMs");
  const file = formData.get("audio");
  if (
    typeof conversationId !== "string" ||
    typeof durationMs !== "string" ||
    !(file instanceof File)
  ) {
    return { ok: false };
  }
  if (!(await isParticipant(conversationId, profile.id))) return { ok: false };

  const uploaded = await uploadVoiceNote(conversationId, profile.id, file);
  if (!uploaded) return { ok: false };

  const message = await sendMessage(conversationId, profile.id, {
    kind: "voice",
    voice: { path: uploaded.path, durationMs: Number(durationMs) || 0 },
  });
  if (!message) return { ok: false };
  return { ok: true, message };
}

/** A fresh signed URL for playback, re-checking participation on every call. */
export async function getVoiceNoteUrlAction(messageId: string): Promise<{ url: string | null }> {
  const profile = await getCurrentProfile();
  if (!profile) return { url: null };

  const message = await getMessageById(messageId);
  if (!message || message.kind !== "voice" || !message.voice) return { url: null };
  if (!(await isParticipant(message.conversationId, profile.id))) return { url: null };

  const url = await getVoiceNoteSignedUrl(message.voice.path);
  return { url };
}

export async function markVoiceNotePlayedAction(messageId: string): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) return;

  const message = await getMessageById(messageId);
  if (!message || message.kind !== "voice") return;
  if (!(await isParticipant(message.conversationId, profile.id))) return;

  await markVoiceNotePlayed(messageId, profile.id);
}

export async function listPendingVoiceNotesAction(): Promise<PendingVoiceNote[]> {
  const profile = await getCurrentProfile();
  if (!profile) return [];
  return listPendingVoiceNotes(profile.id);
}

export interface MessageNotificationPreview {
  senderName: string;
  preview: string;
  conversationId: string;
}

/** Sender name + a short preview line for a toast/OS notification. Re-checks
 * participation itself — never trust a client-supplied messageId blindly. */
export async function getMessageNotificationAction(
  messageId: string,
): Promise<MessageNotificationPreview | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const message = await getMessageById(messageId);
  if (!message || message.senderId === profile.id) return null;
  if (!(await isParticipant(message.conversationId, profile.id))) return null;

  const senderName = await getSenderName(message.senderId);
  const preview =
    message.kind === "track"
      ? `🎵 Shared a track: ${message.track?.title ?? "a song"}`
      : message.kind === "voice"
        ? "🎙️ Sent a voice note"
        : (message.body ?? "").slice(0, 140);

  return { senderName, preview, conversationId: message.conversationId };
}

export async function getUnreadChatsCountAction(): Promise<number> {
  const profile = await getCurrentProfile();
  if (!profile) return 0;
  return countUnreadConversations(profile.id);
}

export async function getConversationSummaryAction(
  conversationId: string,
): Promise<ConversationSummary | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  return getConversationSummary(conversationId, profile.id);
}
