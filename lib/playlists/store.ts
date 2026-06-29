/**
 * User playlist data layer. **SERVER ONLY.** Writes via the service-role client
 * with ownership enforced here in app code (same pattern as rooms/actions.ts).
 * Distinct from the editorial catalog playlists in lib/artists.ts.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { ytThumb } from "@/lib/playlists/types";
import type {
  PlaylistSummary,
  PlaylistTrackInput,
  UserPlaylist,
  UserPlaylistTrack,
} from "@/lib/playlists/types";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function ownsPlaylist(
  admin: Admin,
  userId: string,
  playlistId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("playlists")
    .select("id")
    .eq("id", playlistId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

/** The user's playlists, newest first, with track counts + a cover. */
export async function listPlaylists(
  userId: string,
): Promise<PlaylistSummary[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data: rows } = await admin
    .from("playlists")
    .select("id, name, mood, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (!rows?.length) return [];

  const ids = rows.map((r) => r.id as string);
  const { data: tracks } = await admin
    .from("playlist_tracks")
    .select("playlist_id, video_id, position")
    .in("playlist_id", ids)
    .order("position", { ascending: true });

  // Ordered by position asc, so the first row seen per playlist is its lowest.
  const agg = new Map<string, { count: number; firstVideo: string | null }>();
  for (const t of tracks ?? []) {
    const pid = t.playlist_id as string;
    const cur = agg.get(pid) ?? { count: 0, firstVideo: null };
    cur.count += 1;
    if (cur.firstVideo === null) cur.firstVideo = t.video_id as string;
    agg.set(pid, cur);
  }

  return rows.map((r) => {
    const a = agg.get(r.id as string);
    return {
      id: r.id as string,
      name: (r.name as string) || "Playlist",
      mood: (r.mood as string | null) ?? null,
      trackCount: a?.count ?? 0,
      cover: a?.firstVideo ? ytThumb(a.firstVideo) : null,
      createdAt: (r.created_at as string) ?? "",
    };
  });
}

/** One playlist with ordered tracks, or null if not found / not owned. */
export async function getPlaylistForUser(
  userId: string,
  id: string,
): Promise<UserPlaylist | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  // Editorial playlist ids are slugs (this-is-…, …-radio, genre-…); only real
  // uuids are user playlists. Skip the query for slugs to avoid a uuid error.
  if (!UUID_RE.test(id)) return null;

  const { data: p } = await admin
    .from("playlists")
    .select("id, name, mood, created_at, user_id")
    .eq("id", id)
    .maybeSingle();
  if (!p || p.user_id !== userId) return null;

  const { data: tracks } = await admin
    .from("playlist_tracks")
    .select("id, video_id, title, artist, position")
    .eq("playlist_id", id)
    .order("position", { ascending: true });

  return {
    id: p.id as string,
    name: (p.name as string) || "Playlist",
    mood: (p.mood as string | null) ?? null,
    createdAt: (p.created_at as string) ?? "",
    tracks: (tracks ?? []).map((t) => ({
      id: t.id as string,
      videoId: t.video_id as string,
      title: (t.title as string) || "",
      artist: (t.artist as string | null) ?? null,
      position: (t.position as number) ?? 0,
    })),
  };
}

/** Create a playlist with an initial (ordered) track set. */
export async function createPlaylist(
  userId: string,
  input: { name: string; mood?: string | null; tracks: PlaylistTrackInput[] },
): Promise<{ id: string } | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: pl, error } = await admin
    .from("playlists")
    .insert({
      user_id: userId,
      name: input.name.trim().slice(0, 120) || "New playlist",
      mood: input.mood ?? null,
    })
    .select("id")
    .single();
  if (error || !pl) return null;

  const playlistId = pl.id as string;
  if (input.tracks.length) {
    const rows = input.tracks.map((t, i) => ({
      playlist_id: playlistId,
      video_id: t.videoId,
      title: t.title,
      artist: t.artist ?? null,
      position: i,
    }));
    await admin.from("playlist_tracks").insert(rows);
  }
  return { id: playlistId };
}

/** Append tracks to the end of a playlist (owner only). */
export async function addTracks(
  userId: string,
  playlistId: string,
  tracks: PlaylistTrackInput[],
): Promise<UserPlaylistTrack[] | null> {
  const admin = createAdminClient();
  if (!admin || !tracks.length) return null;
  if (!(await ownsPlaylist(admin, userId, playlistId))) return null;

  const { data: last } = await admin
    .from("playlist_tracks")
    .select("position")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const start = ((last?.position as number | undefined) ?? -1) + 1;

  const rows = tracks.map((t, i) => ({
    playlist_id: playlistId,
    video_id: t.videoId,
    title: t.title,
    artist: t.artist ?? null,
    position: start + i,
  }));
  const { data, error } = await admin
    .from("playlist_tracks")
    .insert(rows)
    .select("id, video_id, title, artist, position");
  if (error) return null;
  return (data ?? []).map((t) => ({
    id: t.id as string,
    videoId: t.video_id as string,
    title: (t.title as string) || "",
    artist: (t.artist as string | null) ?? null,
    position: (t.position as number) ?? 0,
  }));
}

/** Remove a single track (owner only). */
export async function removeTrack(
  userId: string,
  playlistId: string,
  trackId: string,
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  if (!(await ownsPlaylist(admin, userId, playlistId))) return false;
  const { error } = await admin
    .from("playlist_tracks")
    .delete()
    .eq("id", trackId)
    .eq("playlist_id", playlistId);
  return !error;
}

/** Persist a new track order (array of track ids in the desired order). */
export async function reorderTracks(
  userId: string,
  playlistId: string,
  orderedTrackIds: string[],
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  if (!(await ownsPlaylist(admin, userId, playlistId))) return false;
  const results = await Promise.all(
    orderedTrackIds.map((id, i) =>
      admin
        .from("playlist_tracks")
        .update({ position: i })
        .eq("id", id)
        .eq("playlist_id", playlistId),
    ),
  );
  return results.every((r) => !r.error);
}

/** Rename a playlist (owner only). */
export async function renamePlaylist(
  userId: string,
  playlistId: string,
  name: string,
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  const { error } = await admin
    .from("playlists")
    .update({ name: name.trim().slice(0, 120) || "Playlist" })
    .eq("id", playlistId)
    .eq("user_id", userId);
  return !error;
}

/** Delete a playlist and its tracks (cascade) (owner only). */
export async function deletePlaylist(
  userId: string,
  playlistId: string,
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  const { error } = await admin
    .from("playlists")
    .delete()
    .eq("id", playlistId)
    .eq("user_id", userId);
  return !error;
}
