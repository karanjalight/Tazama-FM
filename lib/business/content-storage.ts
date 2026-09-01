/**
 * Business Content Library storage. SERVER ONLY — writes via the
 * service-role client, same pattern as `lib/voice/store.ts`. Unlike
 * `voice-notes`, the `business-content` bucket is PUBLIC (see
 * supabase/business-content-delivery.sql) — content shown on a screen has no
 * confidentiality requirement (a kiosk with no session needs to be able to
 * display it for hours), so reads use a plain public URL instead of minting
 * a signed one.
 */
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "business-content";

// Business promo content is meaningfully bigger than a voice note — a real
// venue-ready promo video can run into the hundreds of MB, while images,
// audio clips, and documents stay small. Generous, reasonable caps — not
// derived from any hard product requirement.
const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200MB
const MAX_OTHER_BYTES = 20 * 1024 * 1024; // 20MB

/** Allowed MIME types → the extension we store the object under. Anything
 * else is rejected — this, not any client-side `accept` attribute, is the
 * real boundary on what can land in the bucket. */
const ALLOWED_MIME_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
};

export interface UploadContentFileResult {
  path: string;
  publicUrl: string;
}

/**
 * Upload a Content Library file to the public `business-content` bucket,
 * namespaced under the caller's own `businessId`. Validates size and MIME
 * type server-side — like voice notes, the client's own checks are a UX
 * nicety, not the real security boundary.
 */
export async function uploadContentFile(
  businessId: string,
  file: File,
): Promise<UploadContentFileResult | null> {
  const admin = createAdminClient();
  if (!admin || !businessId) return null;
  if (file.size === 0) return null;

  const ext = ALLOWED_MIME_EXT[file.type];
  if (!ext) return null;

  const maxBytes = file.type.startsWith("video/") ? MAX_VIDEO_BYTES : MAX_OTHER_BYTES;
  if (file.size > maxBytes) return null;

  const path = `${businessId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    console.error("uploadContentFile failed", businessId, error);
    return null;
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

/** Best-effort delete of a Content Library Storage object — never throws,
 * logs and swallows on failure so a bad delete never blocks the caller's own
 * (already-succeeded) database cleanup. */
export async function deleteContentFile(path: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin || !path) return;
  const { error } = await admin.storage.from(BUCKET).remove([path]);
  if (error) console.error("deleteContentFile failed", path, error);
}

/** Public URL for a stored path — no signing needed, the bucket is public. */
export function getContentPublicUrl(path: string | null): string | null {
  if (!path) return null;
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl ?? null;
}
