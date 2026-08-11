/**
 * Voice-note data layer. SERVER ONLY — writes via the service-role client,
 * same pattern as lib/likes/store.ts. The `voice-notes` Storage bucket is
 * private with no client-facing policies (see supabase/voice-notes.sql) —
 * every access here goes through the admin client, which bypasses RLS, so
 * the caller's authorization (isParticipant) must always be checked before
 * calling into this module, not after.
 */
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "voice-notes";
const MAX_BYTES = 5 * 1024 * 1024; // ~2 minutes of opus-encoded speech, generous
const ALLOWED_MIME_PREFIXES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg"];
const SIGNED_URL_TTL_SECONDS = 10 * 60;

export interface UploadVoiceNoteResult {
  path: string;
}

/**
 * Upload a recorded voice note to private storage. Validates size and MIME
 * type server-side — the client's own checks (recorder duration cap, mime
 * detection) are a UX nicety, not a security boundary; this is the real one.
 */
export async function uploadVoiceNote(
  conversationId: string,
  senderId: string,
  file: File,
): Promise<UploadVoiceNoteResult | null> {
  const admin = createAdminClient();
  if (!admin || !conversationId || !senderId) return null;
  if (file.size === 0 || file.size > MAX_BYTES) return null;
  if (!ALLOWED_MIME_PREFIXES.some((prefix) => file.type.startsWith(prefix))) return null;

  const ext = file.type.includes("ogg") ? "ogg" : file.type.includes("mp4") ? "m4a" : "webm";
  const path = `${conversationId}/${senderId}-${crypto.randomUUID()}.${ext}`;

  const { error } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    console.error("uploadVoiceNote failed", conversationId, error);
    return null;
  }
  return { path };
}

/**
 * A short-lived signed URL for playback. Generated fresh on every call —
 * never cache this long-term, callers should fetch right before playing.
 */
export async function getVoiceNoteSignedUrl(path: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin || !path) return null;

  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    console.error("getVoiceNoteSignedUrl failed", path, error);
    return null;
  }
  return data.signedUrl;
}

export async function markVoiceNotePlayed(messageId: string, userId: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  const { error } = await admin
    .from("voice_note_plays")
    .upsert(
      { message_id: messageId, user_id: userId },
      { onConflict: "message_id,user_id", ignoreDuplicates: true },
    );
  if (error) console.error("markVoiceNotePlayed failed", messageId, userId, error);
}

export async function hasPlayedVoiceNote(messageId: string, userId: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  const { data } = await admin
    .from("voice_note_plays")
    .select("message_id")
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export interface PendingVoiceNote {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  createdAt: string;
}

/** Voice notes sent to this user (by someone else) that they haven't played yet. */
export async function listPendingVoiceNotes(
  userId: string,
  limit = 20,
): Promise<PendingVoiceNote[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data: myConvRows } = await admin
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);
  const convIds = (myConvRows ?? []).map((r) => r.conversation_id as string);
  if (convIds.length === 0) return [];

  const { data: voiceMessages } = await admin
    .from("messages")
    .select("id, conversation_id, sender_id, created_at")
    .in("conversation_id", convIds)
    .eq("kind", "voice")
    .neq("sender_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit * 3); // over-fetch; played ones get filtered out below

  const rows = voiceMessages ?? [];
  if (rows.length === 0) return [];

  const { data: playedRows } = await admin
    .from("voice_note_plays")
    .select("message_id")
    .eq("user_id", userId)
    .in(
      "message_id",
      rows.map((r) => r.id as string),
    );
  const played = new Set((playedRows ?? []).map((r) => r.message_id as string));

  const unplayed = rows.filter((r) => !played.has(r.id as string)).slice(0, limit);
  if (unplayed.length === 0) return [];

  const senderIds = [...new Set(unplayed.map((r) => r.sender_id as string))];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", senderIds);
  const nameById = new Map((profiles ?? []).map((p) => [p.id as string, p.full_name as string]));

  return unplayed.map((r) => ({
    messageId: r.id as string,
    conversationId: r.conversation_id as string,
    senderId: r.sender_id as string,
    senderName: nameById.get(r.sender_id as string) ?? "Someone",
    createdAt: r.created_at as string,
  }));
}
