/**
 * Announcement audio storage. SERVER ONLY — writes via the service-role
 * client, same pattern as `lib/business/content-storage.ts`. Public bucket
 * (see supabase/business-announcement-delivery.sql) — announcement audio
 * plays on unauthenticated branch speakers, which may not touch a given
 * announcement for hours or days (scheduled/repeating), so a plain public
 * URL is used instead of a short-lived signed one.
 */
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "announcement-audio";

// Generous cap for a spoken voice announcement — well beyond what any
// realistic recording or upload here would need.
const MAX_BYTES = 15 * 1024 * 1024; // 15MB

// Matched by prefix, not exact equality — same reasoning as
// `lib/voice/store.ts`'s ALLOWED_MIME_PREFIXES: a browser's MediaRecorder
// reports its mimeType with a codec suffix (e.g. "audio/webm;codecs=opus"),
// which an exact-match lookup would silently reject.
const MIME_EXT_RULES: { prefix: string; ext: string }[] = [
  { prefix: "audio/webm", ext: "webm" },
  { prefix: "audio/ogg", ext: "ogg" },
  { prefix: "audio/mp4", ext: "m4a" },
  { prefix: "audio/mpeg", ext: "mp3" },
  { prefix: "audio/wav", ext: "wav" },
  { prefix: "audio/x-wav", ext: "wav" },
];

function extForMimeType(mimeType: string): string | null {
  return MIME_EXT_RULES.find((r) => mimeType.startsWith(r.prefix))?.ext ?? null;
}

export interface UploadAnnouncementAudioResult {
  path: string;
  publicUrl: string;
}

/**
 * Upload announcement audio (recorded or uploaded client-side) to the public
 * `announcement-audio` bucket, namespaced under the caller's own businessId.
 * Validates size and MIME type server-side — the client's own checks are a
 * UX nicety, not the real security boundary.
 */
export async function uploadAnnouncementAudio(
  businessId: string,
  file: File,
): Promise<UploadAnnouncementAudioResult | null> {
  const admin = createAdminClient();
  if (!admin || !businessId) return null;
  if (file.size === 0 || file.size > MAX_BYTES) return null;

  const ext = extForMimeType(file.type);
  if (!ext) return null;

  const path = `${businessId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    console.error("uploadAnnouncementAudio failed", businessId, error);
    return null;
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

/** Best-effort delete — never throws, logs and swallows on failure so a bad
 * delete never blocks the caller's own (already-succeeded) database cleanup. */
export async function deleteAnnouncementAudio(path: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin || !path) return;
  const { error } = await admin.storage.from(BUCKET).remove([path]);
  if (error) console.error("deleteAnnouncementAudio failed", path, error);
}

/** Public URL for a stored path — no signing needed, the bucket is public. */
export function getAnnouncementAudioPublicUrl(path: string | null): string | null {
  if (!path) return null;
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl ?? null;
}
