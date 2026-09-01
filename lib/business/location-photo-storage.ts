/**
 * "Add Location" wizard photo storage. SERVER ONLY — writes via the
 * service-role client, same pattern as `lib/business/content-storage.ts`.
 * Simpler than that module: this is a single photo per location, not a
 * content library, so there's no video/audio/pdf handling and no per-item
 * metadata beyond the Storage path itself.
 *
 * Public bucket, same reasoning as `business-content`/`announcement-audio`:
 * a location's photo has no confidentiality requirement (it's shown in the
 * business dashboard's own branches list preview), so a plain public URL is
 * simpler than minting/refreshing signed ones.
 */
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "location-photos";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export interface UploadLocationPhotoResult {
  path: string;
  publicUrl: string;
}

/**
 * Upload a location photo to the public `location-photos` bucket, namespaced
 * under the caller's own `businessId`. This upload happens during the "Add
 * Location" wizard, before any branch row exists yet — so the path is keyed
 * on the business, not a not-yet-created branch id.
 */
export async function uploadLocationPhoto(
  businessId: string,
  file: File,
): Promise<UploadLocationPhotoResult | null> {
  const admin = createAdminClient();
  if (!admin || !businessId) return null;
  if (file.size === 0) return null;

  const ext = ALLOWED_MIME_EXT[file.type];
  if (!ext) return null;
  if (file.size > MAX_BYTES) return null;

  const path = `${businessId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    console.error("uploadLocationPhoto failed", businessId, error);
    return null;
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

/** Public URL for a stored path — no signing needed, the bucket is public. */
export function getLocationPhotoPublicUrl(path: string | null): string | null {
  if (!path) return null;
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl ?? null;
}
