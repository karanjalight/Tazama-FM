/**
 * Liked-tracks data layer. **SERVER ONLY.** Writes via the service-role client
 * with ownership enforced here in app code (same pattern as playlists/store.ts).
 * Likes are keyed by (user_id, video_id), so every operation is idempotent.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import type { LikeInput, LikedTrack } from "@/lib/likes/types";

/** The user's liked tracks, newest first. */
export async function listLikes(userId: string): Promise<LikedTrack[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from("liked_tracks")
    .select("video_id, title, artist, thumbnail_url, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((r) => ({
    videoId: r.video_id as string,
    title: (r.title as string) || "",
    artist: (r.artist as string | null) ?? null,
    thumbnailUrl: (r.thumbnail_url as string | null) ?? null,
    createdAt: (r.created_at as string) ?? "",
  }));
}

/** Just the liked video ids — used to seed the client provider's heart state. */
export async function listLikedIds(userId: string): Promise<string[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from("liked_tracks")
    .select("video_id")
    .eq("user_id", userId);

  return (data ?? []).map((r) => r.video_id as string);
}

/** Like a track (idempotent — re-liking is a no-op). */
export async function like(userId: string, track: LikeInput): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin || !track.videoId) return false;

  const { error } = await admin
    .from("liked_tracks")
    .upsert(
      {
        user_id: userId,
        video_id: track.videoId,
        title: track.title || "Untitled",
        artist: track.artist ?? null,
        thumbnail_url: track.thumbnailUrl ?? null,
      },
      { onConflict: "user_id,video_id", ignoreDuplicates: true },
    );
  return !error;
}

/** Unlike a track (idempotent — unliking an absent track is a no-op). */
export async function unlike(userId: string, videoId: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  const { error } = await admin
    .from("liked_tracks")
    .delete()
    .eq("user_id", userId)
    .eq("video_id", videoId);
  return !error;
}
