/**
 * Server-side Content Library + Playlist reads. Uses the service-role client
 * the same way `lib/business/queries.ts` does — visibility/ownership is
 * enforced here in app code by always filtering on the caller's own
 * `business_id`. SERVER ONLY.
 *
 * Content is business-wide, not branch-scoped (see supabase/business-content.sql's
 * own comment) — every function here takes a `businessId`, never a branch id.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { getContentPublicUrl } from "@/lib/business/content-storage";
import { rowToTrack, type Track } from "@/lib/tracks";

export type ContentType = "video" | "image" | "audio" | "document";
export type ContentPurpose = "content" | "ad_creative";
export type ContentStatus = "pending" | "approved" | "rejected";
export type PlaylistStatus = "active" | "draft";

export interface ContentItem {
  id: string;
  businessId: string;
  title: string;
  contentType: ContentType;
  purpose: ContentPurpose;
  format: string | null;
  storagePath: string;
  /** Public URL for the stored file itself. */
  url: string | null;
  thumbnailPath: string | null;
  thumbnailUrl: string | null;
  /** Best available preview image: the file itself for images, else the
   * (currently never-populated) generated thumbnail — never a video/audio
   * frame we didn't actually create. */
  previewUrl: string | null;
  durationSeconds: number | null;
  sizeBytes: number;
  resolution: string | null;
  tag: string | null;
  description: string | null;
  status: ContentStatus;
  uploadedBy: string | null;
  uploadedByName: string | null;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface PlaylistTrack {
  /** business_playlist_tracks.id — the link row, not the track itself. */
  id: string;
  trackId: string;
  position: number;
  addedAt: string;
  track: Track;
}

export interface Playlist {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  coverPath: string | null;
  coverUrl: string | null;
  status: PlaylistStatus;
  createdAt: string;
  tracks: PlaylistTrack[];
}

interface ContentItemRow {
  id: string;
  business_id: string;
  title: string;
  content_type: ContentType;
  purpose: ContentPurpose;
  format: string | null;
  storage_path: string;
  thumbnail_path: string | null;
  duration_seconds: number | null;
  size_bytes: number;
  resolution: string | null;
  tag: string | null;
  description: string | null;
  status: ContentStatus;
  uploaded_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

function rowToContentItem(row: ContentItemRow, names: Map<string, string>): ContentItem {
  const url = getContentPublicUrl(row.storage_path);
  const thumbnailUrl = getContentPublicUrl(row.thumbnail_path);
  return {
    id: row.id,
    businessId: row.business_id,
    title: row.title,
    contentType: row.content_type,
    purpose: row.purpose,
    format: row.format,
    storagePath: row.storage_path,
    url,
    thumbnailPath: row.thumbnail_path,
    thumbnailUrl,
    previewUrl: row.content_type === "image" ? url : thumbnailUrl,
    durationSeconds: row.duration_seconds,
    sizeBytes: row.size_bytes,
    resolution: row.resolution,
    tag: row.tag,
    description: row.description,
    status: row.status,
    uploadedBy: row.uploaded_by,
    uploadedByName: row.uploaded_by ? (names.get(row.uploaded_by) ?? null) : null,
    reviewedBy: row.reviewed_by,
    reviewedByName: row.reviewed_by ? (names.get(row.reviewed_by) ?? null) : null,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

/** Batch-resolve uploader/reviewer display names for a page of content rows. */
async function namesForRows(
  admin: SupabaseClient,
  rows: ContentItemRow[],
): Promise<Map<string, string>> {
  const ids = new Set<string>();
  for (const r of rows) {
    if (r.uploaded_by) ids.add(r.uploaded_by);
    if (r.reviewed_by) ids.add(r.reviewed_by);
  }
  if (!ids.size) return new Map();
  const { data } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", Array.from(ids));
  return new Map(
    ((data ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]),
  );
}

export async function listContentItems(
  businessId: string,
  opts: { purpose?: ContentPurpose } = {},
): Promise<ContentItem[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  let query = admin
    .from("content_items")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (opts.purpose) query = query.eq("purpose", opts.purpose);

  const { data } = await query;
  const rows = (data ?? []) as ContentItemRow[];
  if (!rows.length) return [];

  const names = await namesForRows(admin, rows);
  return rows.map((r) => rowToContentItem(r, names));
}

export async function getContentItem(
  businessId: string,
  id: string,
): Promise<ContentItem | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from("content_items")
    .select("*")
    .eq("business_id", businessId)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const row = data as ContentItemRow;
  const names = await namesForRows(admin, [row]);
  return rowToContentItem(row, names);
}

interface PlaylistRow {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  cover_path: string | null;
  status: PlaylistStatus;
  created_at: string;
}

/** The shape `tracks(*)` comes back as on the `business_playlist_tracks` join. */
interface TrackJoinRow {
  id: string;
  youtube_id: string;
  title: string;
  artist: string | null;
  genre: string;
  thumbnail_url: string | null;
  is_playable: boolean;
}

interface PlaylistTrackJoinRow {
  id: string;
  playlist_id: string;
  track_id: string;
  position: number;
  added_at: string;
  tracks: TrackJoinRow | TrackJoinRow[] | null;
}

function extractTrackRow(joined: TrackJoinRow | TrackJoinRow[] | null): TrackJoinRow | null {
  if (!joined) return null;
  return Array.isArray(joined) ? (joined[0] ?? null) : joined;
}

function rowToPlaylist(row: PlaylistRow, tracks: PlaylistTrack[]): Playlist {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    description: row.description,
    coverPath: row.cover_path,
    // A playlist has no cover-upload UI of its own — its cover is always the
    // first track's thumbnail (tracks are already ordered by position), with
    // the (currently never-set) explicit cover_path only as a fallback for an
    // empty playlist.
    coverUrl: tracks[0]?.track.thumbnailUrl ?? getContentPublicUrl(row.cover_path),
    status: row.status,
    createdAt: row.created_at,
    tracks,
  };
}

/** Fetch + group every playlist's tracks (ordered by position) for a set of playlist ids. */
async function tracksByPlaylist(
  admin: SupabaseClient,
  playlistIds: string[],
): Promise<Map<string, PlaylistTrack[]>> {
  const byPlaylist = new Map<string, PlaylistTrack[]>();
  if (!playlistIds.length) return byPlaylist;

  const { data } = await admin
    .from("business_playlist_tracks")
    .select("id, playlist_id, track_id, position, added_at, tracks(*)")
    .in("playlist_id", playlistIds)
    .order("position", { ascending: true });

  for (const row of (data ?? []) as PlaylistTrackJoinRow[]) {
    const trackRow = extractTrackRow(row.tracks);
    if (!trackRow) continue; // orphaned link row (deleted track) — skip rather than crash
    const list = byPlaylist.get(row.playlist_id) ?? [];
    list.push({
      id: row.id,
      trackId: row.track_id,
      position: row.position,
      addedAt: row.added_at,
      track: rowToTrack(trackRow),
    });
    byPlaylist.set(row.playlist_id, list);
  }
  return byPlaylist;
}

export async function listPlaylists(businessId: string): Promise<Playlist[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from("business_playlists")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as PlaylistRow[];
  if (!rows.length) return [];

  const byPlaylist = await tracksByPlaylist(
    admin,
    rows.map((r) => r.id),
  );
  return rows.map((r) => rowToPlaylist(r, byPlaylist.get(r.id) ?? []));
}

export async function getPlaylist(businessId: string, id: string): Promise<Playlist | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from("business_playlists")
    .select("*")
    .eq("business_id", businessId)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const row = data as PlaylistRow;
  const byPlaylist = await tracksByPlaylist(admin, [row.id]);
  return rowToPlaylist(row, byPlaylist.get(row.id) ?? []);
}

// formatDuration/formatFileSize moved to ./content-format.ts — pure display
// helpers that client components need without pulling this server-only
// module (service-role client) into the browser bundle.
