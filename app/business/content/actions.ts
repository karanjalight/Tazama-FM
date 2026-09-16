"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getBusinessViewer } from "@/lib/business/viewer";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getContentItem, getPlaylist } from "@/lib/business/content-queries";
import { deleteContentFile } from "@/lib/business/content-storage";
import { insertContentItem } from "@/lib/business/content-upload";
import { upsertTracksFromYouTube } from "@/lib/tracks";
import { searchTracks, type YouTubeTrack } from "@/lib/youtube/search";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveGenre } from "@/lib/genres";
import { scheduleMixRefill } from "@/lib/business/playlist-mix-pool";
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
const playlistPlaybackModeSchema = z.enum(["repeat", "continuous"]);
const playlistGenresSchema = z.array(z.string().trim().min(1).max(60)).max(10);
const PLAYLISTS_PATH = "/business/playlists";

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
  const durationRaw = formData.get("durationSeconds");
  if (
    typeof title !== "string" ||
    typeof contentType !== "string" ||
    !(file instanceof File)
  ) {
    return { ok: false, error: "Missing title, type, or file." };
  }
  // Best-effort, client-read from the file itself (see upload-content-dialog.tsx)
  // — absent for images (no natural duration) or when metadata read failed.
  const durationSeconds =
    typeof durationRaw === "string" && Number.isFinite(Number(durationRaw)) && Number(durationRaw) > 0
      ? Math.round(Number(durationRaw))
      : null;

  const parsedTitle = titleSchema.safeParse(title);
  if (!parsedTitle.success) {
    return { ok: false, error: parsedTitle.error.issues[0]?.message ?? "Invalid title." };
  }
  const parsedType = contentTypeSchema.safeParse(contentType);
  if (!parsedType.success) {
    return { ok: false, error: "Invalid content type." };
  }

  const profile = await getCurrentProfile();
  const result = await insertContentItem({
    businessId: viewer.businessId,
    uploadedBy: profile?.id ?? null,
    title: parsedTitle.data,
    contentType: parsedType.data,
    purpose: "content",
    file,
    durationSeconds,
  });
  if (!result.ok) return result;

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
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false, error: "Please sign in." };

  const parsed = createPlaylistSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid playlist." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { data: created, error } = await admin
    .from("business_playlists")
    .insert({
      business_id: viewer.businessId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      status: "draft",
    })
    .select("id")
    .single();
  if (error || !created) return { ok: false, error: "Could not create the playlist." };

  revalidatePath(CONTENT_LIBRARY_PATH);
  revalidatePath(PLAYLISTS_PATH);
  return { ok: true, id: created.id as string };
}

const updatePlaylistSchema = z.object({
  businessId: z.string().uuid(),
  id: z.string().uuid(),
  name: playlistNameSchema.optional(),
  description: playlistDescriptionSchema.optional(),
  status: playlistStatusSchema.optional(),
  genres: playlistGenresSchema.optional(),
  playbackMode: playlistPlaybackModeSchema.optional(),
});

export async function updatePlaylist(input: {
  businessId: string;
  id: string;
  name?: string;
  description?: string;
  status?: "active" | "draft";
  genres?: string[];
  playbackMode?: "repeat" | "continuous";
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
  if (parsed.data.genres !== undefined) {
    patch.genres = [
      ...new Set(parsed.data.genres.map((g) => resolveGenre(g)?.value).filter((g): g is string => !!g)),
    ];
  }
  if (parsed.data.playbackMode !== undefined) patch.playback_mode = parsed.data.playbackMode;
  if (Object.keys(patch).length === 0) return { ok: true };

  const { error } = await admin
    .from("business_playlists")
    .update(patch)
    .eq("id", playlist.id)
    .eq("business_id", viewer.businessId);
  if (error) {
    // Genres/playback mode columns come from business-playlist-ai.sql.
    const settingsChange = parsed.data.genres !== undefined || parsed.data.playbackMode !== undefined;
    return {
      ok: false,
      error: settingsChange
        ? "Could not save playback settings — has supabase/business-playlist-ai.sql been applied?"
        : "Could not update the playlist.",
    };
  }

  // Continuous playback (or new genres for it) — start filling the mix pool
  // now instead of waiting for the first song change.
  if (
    (parsed.data.playbackMode ?? playlist.playbackMode) === "continuous" &&
    (parsed.data.playbackMode !== undefined || parsed.data.genres !== undefined)
  ) {
    scheduleMixRefill(admin, playlist.id);
  }

  revalidatePath(CONTENT_LIBRARY_PATH);
  revalidatePath(PLAYLISTS_PATH);
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

/**
 * Add songs that are already in the shared catalog (they carry real
 * `tracks.id`s) — what the "Generate with AI" dialog hands back, since
 * generation already cataloged every song it suggests.
 */
export async function addCatalogTracksToPlaylist(input: {
  businessId: string;
  playlistId: string;
  trackIds: string[];
}): Promise<{ ok: true; added: number } | { ok: false; error: string }> {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false, error: "Please sign in." };

  const parsedIds = z.array(z.string().uuid()).min(1).max(200).safeParse(input.trackIds);
  if (!parsedIds.success) return { ok: false, error: "Pick at least one song." };

  const playlist = await getPlaylist(viewer.businessId, input.playlistId);
  if (!playlist) return { ok: false, error: "Playlist not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const existingTrackIds = new Set(playlist.tracks.map((t) => t.trackId));
  const trackIds = [...new Set(parsedIds.data)].filter((id) => !existingTrackIds.has(id));
  if (!trackIds.length) return { ok: true, added: 0 };

  const nextPosition = playlist.tracks.length
    ? Math.max(...playlist.tracks.map((t) => t.position)) + 1
    : 0;
  const { error } = await admin.from("business_playlist_tracks").insert(
    trackIds.map((trackId, i) => ({
      playlist_id: playlist.id,
      track_id: trackId,
      position: nextPosition + i,
    })),
  );
  if (error) return { ok: false, error: "Could not add songs to the playlist." };

  // A song promoted from the mix pool into the saved list shouldn't also
  // stay in the pool (best-effort; the table may not exist yet).
  await admin.from("business_playlist_mix").delete().eq("playlist_id", playlist.id).in("track_id", trackIds);

  revalidatePath(CONTENT_LIBRARY_PATH);
  revalidatePath(PLAYLISTS_PATH);
  return { ok: true, added: trackIds.length };
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
