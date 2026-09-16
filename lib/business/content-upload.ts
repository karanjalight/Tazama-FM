/**
 * Shared "upload a file + insert its content_items row" logic, extracted out
 * of `uploadContentItem` (app/business/content/actions.ts) so the Ad Library
 * can reuse the exact same real path with `purpose: "ad_creative"` instead
 * of duplicating it. Everything else about a content_items row (edit,
 * approve/reject, delete) is already purpose-agnostic and reused as-is from
 * app/business/content/actions.ts — only the initial insert needed to become
 * parameterized. SERVER ONLY.
 */
import { uploadContentFile, deleteContentFile } from "@/lib/business/content-storage";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ContentPurpose, ContentType } from "@/lib/business/content-queries";

export interface InsertContentItemInput {
  businessId: string;
  uploadedBy: string | null;
  title: string;
  contentType: ContentType;
  purpose: ContentPurpose;
  file: File;
  /** Best-effort, client-measured — null for images or when metadata read failed. */
  durationSeconds: number | null;
}

export async function insertContentItem(
  input: InsertContentItemInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const uploaded = await uploadContentFile(input.businessId, input.file);
  if (!uploaded) {
    return { ok: false, error: "Could not upload the file — check its size and format." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured (missing service-role key)." };

  // Prefer the filename's real extension; fall back to the MIME subtype when
  // there isn't one. `"noext".split(".").pop()` would otherwise return the
  // whole filename (truthy), so the dot must be checked for explicitly
  // rather than just falling through on an empty split result.
  const nameExt = input.file.name.includes(".") ? input.file.name.split(".").pop() : undefined;
  const mimeExt = input.file.type.split("/").pop();
  const format = (nameExt || mimeExt || "").toUpperCase() || null;

  const { data, error } = await admin
    .from("content_items")
    .insert({
      business_id: input.businessId,
      title: input.title,
      content_type: input.contentType,
      purpose: input.purpose,
      format,
      storage_path: uploaded.path,
      size_bytes: input.file.size,
      duration_seconds: input.durationSeconds,
      status: "pending",
      uploaded_by: input.uploadedBy,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("insertContentItem: insert failed", error);
    // Best-effort cleanup: don't leave an orphaned Storage object behind
    // when the row insert fails.
    await deleteContentFile(uploaded.path);
    return { ok: false, error: "Could not save the content item." };
  }

  return { ok: true, id: data.id as string };
}
