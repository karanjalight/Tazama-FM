"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getBusinessViewer } from "@/lib/business/viewer";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getContentItem, getPlaylist } from "@/lib/business/content-queries";
import { uploadContentFile, deleteContentFile } from "@/lib/business/content-storage";
import { upsertTracksFromYouTube } from "@/lib/tracks";
import { searchTracks, type YouTubeTrack } from "@/lib/youtube/search";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/business/types";

// Content Library is a top-level, business-wide page (not nested under any
// one branch — see supabase/business-content.sql's own comment on why).
const CONTENT_LIBRARY_PATH = "/business/content-library";

/** Only the owner or an 'admin' may approve/reject content (not managers). */
function requireAdminLevel(
  viewer: Awaited<ReturnType<typeof getBusinessViewer>>,
): viewer is NonNullable<typeof viewer> & { role: "owner" | "admin" } {
  return !!viewer && (viewer.role === "owner" || viewer.role === "admin");
}

const titleSchema = z.string().trim().min(1, "Give this a title.").max(120);
const contentTypeSchema = z.enum(["video", "image", "audio", "document"]);
const tagSchema = z.string().trim().max(40);
const descriptionSchema = z.string().trim().max(2000);
const statusSchema = z.enum(["pending", "approved", "rejected"]);

const playlistNameSchema = z.string().trim().min(1, "Give this playlist a name.").max(80);
const playlistDescriptionSchema = z.string().trim().max(300);
const playlistStatusSchema = z.enum(["active", "draft"]);

const trackPickSchema = z.object({
  youtubeId: z.string().min(5),
  title: z.string().min(1),
  artist: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
});

// ── Content items ────────────────────────────────────────────────────────

/**
 * Upload a file + create its `content_items` row, in one step. `businessId`
 * is never read from the client — it comes from the viewer's own session.
 */
export async function uploadContentItem(formData: FormData): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false, error: "Please sign in." };

  const title = formData.get("title");
  const contentType = formData.get("contentType");
  const file = formData.get("file");
  if (
    typeof title !== "string" ||
    typeof contentType !== "string" ||
    !(file instanceof File)
  ) {
    return { ok: false, error: "Missing title, type, or file." };
  }

  const parsedTitle = titleSchema.safeParse(title);
  if (!parsedTitle.success) {
    return { ok: false, error: parsedTitle.error.issues[0]?.message ?? "Invalid title." };
  }
  const parsedType = contentTypeSchema.safeParse(contentType);
  if (!parsedType.success) {
    return { ok: false, error: "Invalid content type." };
  }

  const uploaded = await uploadContentFile(viewer.businessId, file);
  if (!uploaded) {
    return { ok: false, error: "Could not upload the file — check its size and format." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured (missing service-role key)." };

  const profile = await getCurrentProfile();
  // Prefer the filename's real extension; fall back to the MIME subtype
  // when there isn't one. `"noext".split(".").pop()` would otherwise return
  // the whole filename (truthy), so the dot must be checked for explicitly
  // rather than just falling through on an empty split result.
  const nameExt = file.name.includes(".") ? file.name.split(".").pop() : undefined;
  const mimeExt = file.type.split("/").pop();
  const format = (nameExt || mimeExt || "").toUpperCase() || null;

  const { error } = await admin.from("content_items").insert({
    business_id: viewer.businessId,
    title: parsedTitle.data,
    content_type: parsedType.data,
    purpose: "content",
    format,
    storage_path: uploaded.path,
    size_bytes: file.size,
    status: "pending",
    uploaded_by: profile?.id ?? null,
  });
  if (error) {
    console.error("uploadContentItem: insert failed", error);
    // Best-effort cleanup: don't leave an orphaned Storage object behind
    // when the row insert fails.
    await deleteContentFile(uploaded.path);
    return { ok: false, error: "Could not save the content item." };
  }

  revalidatePath(CONTENT_LIBRARY_PATH);
  return { ok: true };
}

const updateContentSchema = z.object({
  businessId: z.string().uuid(),
  id: z.string().uuid(),
  title: titleSchema.optional(),
  tag: tagSchema.optional(),
  description: descriptionSchema.optional(),
  status: statusSchema.optional(),
});

export async function updateContentItem(input: {
  businessId: string;
  id: string;
  title?: string;
  tag?: string;
  description?: string;
  status?: "pending" | "approved" | "rejected";
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false, error: "Please sign in." };

  const parsed = updateContentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid update." };
  }

  // A manager shouldn't be able to self-approve/reject their own content.
  if (parsed.data.status !== undefined && !requireAdminLevel(viewer)) {
    return { ok: false, error: "Only an owner or admin can change review status." };
  }

  const item = await getContentItem(viewer.businessId, parsed.data.id);
  if (!item) return { ok: false, error: "Content item not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const patch: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.tag !== undefined) patch.tag = parsed.data.tag;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.status !== undefined) {
    patch.status = parsed.data.status;
    const profile = await getCurrentProfile();
    patch.reviewed_by = profile?.id ?? null;
    patch.reviewed_at = new Date().toISOString();
  }
  if (Object.keys(patch).length === 0) return { ok: true };

  const { error } = await admin
    .from("content_items")
    .update(patch)
    .eq("id", item.id)
    .eq("business_id", viewer.businessId);
  if (error) return { ok: false, error: "Could not update the content item." };

  revalidatePath(CONTENT_LIBRARY_PATH);
  return { ok: true };
}

export async function deleteContentItem(input: {
  businessId: string;
  id: string;
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false, error: "Please sign in." };

  const item = await getContentItem(viewer.businessId, input.id);
  if (!item) return { ok: false, error: "Content item not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { error } = await admin
    .from("content_items")
    .delete()
    .eq("id", item.id)
    .eq("business_id", viewer.businessId);
  if (error) return { ok: false, error: "Could not delete the content item." };

  // Best-effort: the database row is already gone, so a failure removing
  // the Storage object shouldn't turn into a delete the UI has to explain
  // away — a leaked object is a cheap, invisible cost by comparison.
  await deleteContentFile(item.storagePath);

  revalidatePath(CONTENT_LIBRARY_PATH);
  return { ok: true };
}

// ── Playlists ────────────────────────────────────────────────────────────

const createPlaylistSchema = z.object({
  businessId: z.string().uuid(),
  name: playlistNameSchema,
  description: playlistDescriptionSchema.optional(),
});

export async function createPlaylist(input: {
  businessId: string;
  name: string;
  description?: string;
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false, error: "Please sign in." };

  const parsed = createPlaylistSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid playlist." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { error } = await admin.from("business_playlists").insert({
    business_id: viewer.businessId,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    status: "draft",
  });
  if (error) return { ok: false, error: "Could not create the playlist." };

  revalidatePath(CONTENT_LIBRARY_PATH);
  return { ok: true };
}

const updatePlaylistSchema = z.object({
  businessId: z.string().uuid(),
  id: z.string().uuid(),
  name: playlistNameSchema.optional(),
  description: playlistDescriptionSchema.optional(),
  status: playlistStatusSchema.optional(),
});

export async function updatePlaylist(input: {
  businessId: string;
  id: string;
  name?: string;
  description?: string;
  status?: "active" | "draft";
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false, error: "Please sign in." };

  const parsed = updatePlaylistSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid update." };
  }

  const playlist = await getPlaylist(viewer.businessId, parsed.data.id);
  if (!playlist) return { ok: false, error: "Playlist not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.status !== undefined) patch.status = parsed.data.status;
  if (Object.keys(patch).length === 0) return { ok: true };

  const { error } = await admin
    .from("business_playlists")
    .update(patch)
    .eq("id", playlist.id)
    .eq("business_id", viewer.businessId);
  if (error) return { ok: false, error: "Could not update the playlist." };

  revalidatePath(CONTENT_LIBRARY_PATH);
  return { ok: true };
}

export async function deletePlaylist(input: {
  businessId: string;
  id: string;
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false, error: "Please sign in." };

  const playlist = await getPlaylist(viewer.businessId, input.id);
  if (!playlist) return { ok: false, error: "Playlist not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  // business_playlist_tracks has ON DELETE CASCADE from playlist_id — no
  // manual link-row cleanup needed.
  const { error } = await admin
    .from("business_playlists")
    .delete()
    .eq("id", playlist.id)
    .eq("business_id", viewer.businessId);
  if (error) return { ok: false, error: "Could not delete the playlist." };

  revalidatePath(CONTENT_LIBRARY_PATH);
  return { ok: true };
}

export async function addTracksToPlaylist(input: {
  businessId: string;
  playlistId: string;
  picks: YouTubeTrack[];
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false, error: "Please sign in." };

  const parsedPicks = z.array(trackPickSchema).min(1).max(50).safeParse(input.picks);
  if (!parsedPicks.success) {
    return { ok: false, error: "Pick at least one track." };
  }

  const playlist = await getPlaylist(viewer.businessId, input.playlistId);
  if (!playlist) return { ok: false, error: "Playlist not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const tracks = await upsertTracksFromYouTube(admin, parsedPicks.data);
  if (!tracks.length) return { ok: false, error: "Could not resolve the picked tracks." };

  // Skip anything already on this playlist (unique(playlist_id, track_id))
  // rather than let one conflicting row fail the whole insert.
  const existingTrackIds = new Set(playlist.tracks.map((t) => t.trackId));
  const nextPosition = playlist.tracks.length
    ? Math.max(...playlist.tracks.map((t) => t.position)) + 1
    : 0;

  const rows = tracks
    .filter((t) => !existingTrackIds.has(t.id))
    .map((t, i) => ({
      playlist_id: playlist.id,
      track_id: t.id,
      position: nextPosition + i,
    }));
  if (!rows.length) return { ok: true }; // every pick was already on the playlist

  const { error } = await admin.from("business_playlist_tracks").insert(rows);
  if (error) return { ok: false, error: "Could not add tracks to the playlist." };

  revalidatePath(CONTENT_LIBRARY_PATH);
  return { ok: true };
}

export async function removeTrackFromPlaylist(input: {
  businessId: string;
  playlistId: string;
  trackId: string;
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false, error: "Please sign in." };

  const playlist = await getPlaylist(viewer.businessId, input.playlistId);
  if (!playlist) return { ok: false, error: "Playlist not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { error } = await admin
    .from("business_playlist_tracks")
    .delete()
    .eq("playlist_id", playlist.id)
    .eq("track_id", input.trackId);
  if (error) return { ok: false, error: "Could not remove the track." };

  revalidatePath(CONTENT_LIBRARY_PATH);
  return { ok: true };
}

/**
 * Thin, gated wrapper around `searchTracks` for the Add Tracks picker — no
 * new API route needed, this is called directly as a server action.
 */
export async function searchBusinessTracks(query: string): Promise<YouTubeTrack[]> {
  const viewer = await getBusinessViewer();
  if (!viewer) return [];

  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  try {
    return await searchTracks(trimmed, 20);
  } catch (err) {
    console.error("searchBusinessTracks failed", err);
    return [];
  }
}
