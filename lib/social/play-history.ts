/**
 * Play-history data layer. SERVER ONLY. Writes via the service-role client —
 * same pattern as lib/likes/store.ts. One row per track-start.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { formatRelativeTime } from "@/lib/utils";

export type ActivitySource = "dashboard" | "room" | "chat";

export interface PlayInput {
  youtubeId: string;
  title: string;
  artist: string | null;
  thumbnailUrl: string | null;
}

/** Log a track-start for a user. Best-effort — failures are swallowed. */
export async function logPlay(
  userId: string,
  track: PlayInput,
  source: ActivitySource,
): Promise<void> {
  const admin = createAdminClient();
  if (!admin || !userId || !track.youtubeId) return;

  await admin.from("play_history").insert({
    user_id: userId,
    youtube_id: track.youtubeId,
    title: track.title || "Untitled",
    artist: track.artist,
    thumbnail_url: track.thumbnailUrl,
    source,
  });
}

export interface ActivityEntry {
  userId: string;
  fullName: string;
  avatarKey: string | null;
  youtubeId: string;
  title: string;
  artist: string | null;
  thumbnailUrl: string | null;
  source: ActivitySource;
  playedAt: string;
}

/** Ids the viewer has blocked, or that have blocked the viewer (either direction). */
async function hiddenUserIds(viewerId: string): Promise<Set<string>> {
  const admin = createAdminClient();
  const hidden = new Set<string>();
  if (!admin) return hidden;

  const { data } = await admin
    .from("blocked_users")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${viewerId},blocked_id.eq.${viewerId}`);
  for (const b of data ?? []) {
    const blockerId = b.blocker_id as string;
    const blockedId = b.blocked_id as string;
    hidden.add(blockerId === viewerId ? blockedId : blockerId);
  }
  return hidden;
}

/** Recent plays across every user with public activity, newest first. */
export async function listGlobalActivity(
  viewerId: string,
  limit = 30,
): Promise<ActivityEntry[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const hidden = await hiddenUserIds(viewerId);

  // Two queries, merged in app code — NOT a `.select("profiles(...)")` embed.
  // `play_history.user_id` and `profiles.id` both FK to auth.users but not to
  // each other, so PostgREST has no relationship to auto-join on (the same
  // reason rooms denormalize `added_by_name` instead of joining profiles).
  // Over-fetch raw plays since the activity_public filter has to happen after
  // the profile lookup, not inside this query.
  const { data: rawPlays } = await admin
    .from("play_history")
    .select("user_id, youtube_id, title, artist, thumbnail_url, source, played_at")
    .order("played_at", { ascending: false })
    .limit(limit * 4);
  const rows = (rawPlays ?? []).filter((r) => !hidden.has(r.user_id as string));
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((r) => r.user_id as string))];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, avatar_key, activity_public")
    .in("id", userIds);
  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  const out: ActivityEntry[] = [];
  for (const r of rows) {
    if (out.length >= limit) break;
    const profile = profileById.get(r.user_id as string);
    if (!profile || profile.activity_public !== true) continue;
    out.push({
      userId: r.user_id as string,
      fullName: (profile.full_name as string) ?? "",
      avatarKey: (profile.avatar_key as string | null) ?? null,
      youtubeId: r.youtube_id as string,
      title: r.title as string,
      artist: (r.artist as string | null) ?? null,
      thumbnailUrl: (r.thumbnail_url as string | null) ?? null,
      source: r.source as ActivitySource,
      playedAt: r.played_at as string,
    });
  }
  return out;
}

/**
 * One user's recent plays, for their public profile page. Returns [] when the
 * viewer isn't allowed to see it (owner viewing themself is always allowed).
 */
export async function listUserActivity(
  targetUserId: string,
  viewerId: string,
  limit = 20,
): Promise<ActivityEntry[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  if (targetUserId !== viewerId) {
    const hidden = await hiddenUserIds(viewerId);
    if (hidden.has(targetUserId)) return [];

    const { data: profile } = await admin
      .from("profiles")
      .select("activity_public")
      .eq("id", targetUserId)
      .maybeSingle();
    if (!profile?.activity_public) return [];
  }

  const { data } = await admin
    .from("play_history")
    .select("user_id, youtube_id, title, artist, thumbnail_url, source, played_at")
    .eq("user_id", targetUserId)
    .order("played_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => ({
    userId: r.user_id as string,
    fullName: "",
    avatarKey: null,
    youtubeId: r.youtube_id as string,
    title: r.title as string,
    artist: (r.artist as string | null) ?? null,
    thumbnailUrl: (r.thumbnail_url as string | null) ?? null,
    source: r.source as ActivitySource,
    playedAt: r.played_at as string,
  }));
}

const LISTENING_NOW_WINDOW_MS = 5 * 60 * 1000;

/**
 * A ready-to-render "what are they up to" line for a chat thread header —
 * "Listening to X" if their last play was within the last 5 minutes, else
 * "Last played X · 2h ago". A page-load snapshot, not live-updating. Same
 * privacy/block gate as listUserActivity — if they've turned off activity
 * sharing, or you're blocked either way, this returns null.
 */
export async function getListeningStatus(
  targetUserId: string,
  viewerId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  if (targetUserId !== viewerId) {
    const hidden = await hiddenUserIds(viewerId);
    if (hidden.has(targetUserId)) return null;

    const { data: profile } = await admin
      .from("profiles")
      .select("activity_public")
      .eq("id", targetUserId)
      .maybeSingle();
    if (!profile?.activity_public) return null;
  }

  const { data } = await admin
    .from("play_history")
    .select("title, artist, played_at")
    .eq("user_id", targetUserId)
    .order("played_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;

  const title = data.title as string;
  const artist = data.artist as string | null;
  const playedAt = data.played_at as string;
  const track = artist ? `${title} — ${artist}` : title;
  const isRecent = Date.now() - new Date(playedAt).getTime() < LISTENING_NOW_WINDOW_MS;

  return isRecent
    ? `Listening to ${track}`
    : `Last played ${track} · ${formatRelativeTime(playedAt)}`;
}
