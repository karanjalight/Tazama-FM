/**
 * Gamification data layer. SERVER ONLY — writes via the service-role client.
 * Every award is opportunistic (called right after the triggering action, no
 * cron) and idempotent via point_events_dedup_idx.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import {
  POINT_VALUES,
  computeStreakDays,
  eligibleBadges,
  type PointEventType,
  type BadgeStats,
} from "@/lib/gamification/rules";

async function awardPoints(
  userId: string,
  eventType: PointEventType,
  refId: string,
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from("point_events").upsert(
    { user_id: userId, event_type: eventType, points: POINT_VALUES[eventType], ref_id: refId },
    { onConflict: "user_id,event_type,ref_id", ignoreDuplicates: true },
  );
}

async function buildBadgeStats(userId: string): Promise<BadgeStats> {
  const admin = createAdminClient();
  const empty: BadgeStats = {
    totalPlays: 0,
    distinctGenres: 0,
    streakDays: 0,
    sharesPlayedByOthers: 0,
    activeConversations: 0,
    nightOwlPlays: 0,
    distinctTracks: 0,
  };
  if (!admin) return empty;

  const { data: plays } = await admin
    .from("play_history")
    .select("youtube_id, played_at")
    .eq("user_id", userId)
    .limit(2000);
  const rows = plays ?? [];

  const totalPlays = rows.length;
  const distinctTracks = new Set(rows.map((r) => r.youtube_id as string)).size;
  const playDays = rows.map((r) => (r.played_at as string).slice(0, 10));
  const streakDays = computeStreakDays(playDays);
  const nightOwlPlays = rows.filter((r) => {
    const hour = new Date(r.played_at as string).getUTCHours();
    return hour < 5;
  }).length;

  let distinctGenres = 0;
  const youtubeIds = [...new Set(rows.map((r) => r.youtube_id as string))];
  if (youtubeIds.length > 0) {
    const { data: tracks } = await admin
      .from("tracks")
      .select("genre")
      .in("youtube_id", youtubeIds);
    distinctGenres = new Set((tracks ?? []).map((t) => t.genre as string)).size;
  }

  const { count: sharesPlayedByOthers } = await admin
    .from("point_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", "shared_track_played");

  const { data: participantRows } = await admin
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);

  return {
    totalPlays,
    distinctGenres,
    streakDays,
    sharesPlayedByOthers: sharesPlayedByOthers ?? 0,
    activeConversations: participantRows?.length ?? 0,
    nightOwlPlays,
    distinctTracks,
  };
}

/** Re-evaluate and award any badges the user newly qualifies for. */
export async function evaluateBadges(userId: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  const stats = await buildBadgeStats(userId);
  const eligible = eligibleBadges(stats);
  if (eligible.length === 0) return;

  const { data: existing } = await admin
    .from("user_badges")
    .select("badge_key")
    .eq("user_id", userId);
  const already = new Set((existing ?? []).map((r) => r.badge_key as string));
  const fresh = eligible.filter((k) => !already.has(k));
  if (fresh.length === 0) return;

  await admin
    .from("user_badges")
    .upsert(
      fresh.map((badge_key) => ({ user_id: userId, badge_key })),
      { onConflict: "user_id,badge_key", ignoreDuplicates: true },
    );
}

/** Call right after a track-start is logged (any source). */
export async function onTrackPlayed(userId: string, youtubeId: string): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  await awardPoints(userId, "track_played", `${youtubeId}:${day}`);

  const admin = createAdminClient();
  if (admin) {
    const { data: plays } = await admin
      .from("play_history")
      .select("played_at")
      .eq("user_id", userId)
      .limit(2000);
    const playDays = (plays ?? []).map((r) => (r.played_at as string).slice(0, 10));
    if (computeStreakDays(playDays) === 7) {
      await awardPoints(userId, "streak_day_7", day);
    }
  }

  await evaluateBadges(userId);
}

/** Call right after a kind:'track' message is sent. */
export async function onTrackShared(userId: string, messageId: string): Promise<void> {
  await awardPoints(userId, "track_shared", messageId);
}

/** Call right after a shared-track card is played by someone other than its sender. */
export async function onSharedTrackPlayed(senderId: string, messageId: string): Promise<void> {
  await awardPoints(senderId, "shared_track_played", messageId);
  await evaluateBadges(senderId);
}

export interface LeaderboardEntry {
  userId: string;
  fullName: string;
  avatarKey: string | null;
  totalPoints: number;
}

export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data: events } = await admin.from("point_events").select("user_id, points").limit(20_000);
  const totals = new Map<string, number>();
  for (const e of events ?? []) {
    const uid = e.user_id as string;
    totals.set(uid, (totals.get(uid) ?? 0) + (e.points as number));
  }

  const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  if (top.length === 0) return [];

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, avatar_key")
    .in("id", top.map(([id]) => id));
  const byId = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  return top
    .map(([userId, totalPoints]) => {
      const p = byId.get(userId);
      if (!p) return null;
      return {
        userId,
        fullName: (p.full_name as string) ?? "",
        avatarKey: (p.avatar_key as string | null) ?? null,
        totalPoints,
      };
    })
    .filter((e): e is LeaderboardEntry => e !== null);
}

export async function listUserBadges(userId: string): Promise<string[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin.from("user_badges").select("badge_key").eq("user_id", userId);
  return (data ?? []).map((r) => r.badge_key as string);
}
