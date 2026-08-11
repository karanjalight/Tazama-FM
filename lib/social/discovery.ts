/** Discovery data layer. SERVER ONLY — reads via the service-role client. */
import { createAdminClient } from "@/lib/supabase/admin";
import { genreFamily } from "@/lib/genres";
import { rankCandidates, type CandidateInput } from "@/lib/social/match-score";

export interface UserSummary {
  id: string;
  fullName: string;
  avatarKey: string | null;
}

export interface SuggestedUser extends UserSummary {
  score: number;
  /** Distinct tracks played (all-time) — a "songs listened to" stat for discovery cards. */
  songsListened: number;
}

const CANDIDATE_POOL_SIZE = 200;

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

/** Ranked user suggestions blending genre overlap with shared listening history. */
export async function getSuggestedUsers(
  viewerId: string,
  viewerGenres: string[],
  limit = 20,
): Promise<SuggestedUser[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const hidden = await hiddenUserIds(viewerId);

  const { data: candidateProfiles } = await admin
    .from("profiles")
    .select("id, full_name, avatar_key, genre_preferences")
    .neq("id", viewerId)
    .limit(CANDIDATE_POOL_SIZE);

  const pool = (candidateProfiles ?? []).filter((p) => !hidden.has(p.id as string));
  if (pool.length === 0) return [];

  const { data: viewerPlays } = await admin
    .from("play_history")
    .select("youtube_id")
    .eq("user_id", viewerId)
    .limit(500);
  const viewerTrackIds = new Set((viewerPlays ?? []).map((r) => r.youtube_id as string));

  // Fetched once, used two ways below: shared-track scoring (only matters if
  // the viewer has history of their own) and each candidate's distinct-songs
  // count (always wanted, for the "songs listened to" stat on discovery cards).
  const candidateIds = pool.map((p) => p.id as string);
  const { data: candidatePlays } = await admin
    .from("play_history")
    .select("user_id, youtube_id")
    .in("user_id", candidateIds)
    .limit(5000);

  const sharedByUser = new Map<string, number>();
  const distinctTracksByUser = new Map<string, Set<string>>();
  for (const row of candidatePlays ?? []) {
    const uid = row.user_id as string;
    const youtubeId = row.youtube_id as string;

    if (!distinctTracksByUser.has(uid)) distinctTracksByUser.set(uid, new Set());
    distinctTracksByUser.get(uid)!.add(youtubeId);

    if (viewerTrackIds.has(youtubeId)) {
      sharedByUser.set(uid, (sharedByUser.get(uid) ?? 0) + 1);
    }
  }

  const candidates: CandidateInput[] = pool.map((p) => ({
    userId: p.id as string,
    genres: (p.genre_preferences as string[] | null) ?? [],
    sharedTrackCount: sharedByUser.get(p.id as string) ?? 0,
  }));

  const ranked = rankCandidates(candidates, limit, {
    viewerGenres,
    familyOf: genreFamily,
  });

  const byId = new Map(pool.map((p) => [p.id as string, p]));
  return ranked
    .map((r) => {
      const p = byId.get(r.userId);
      if (!p) return null;
      return {
        id: r.userId,
        fullName: (p.full_name as string) ?? "",
        avatarKey: (p.avatar_key as string | null) ?? null,
        score: r.score,
        songsListened: distinctTracksByUser.get(r.userId)?.size ?? 0,
      };
    })
    .filter((u): u is SuggestedUser => u !== null);
}

/** Plain name search — there's no username field, so this is ILIKE on full_name. */
export async function searchUsersByName(
  query: string,
  excludeUserId: string,
  limit = 10,
): Promise<UserSummary[]> {
  const admin = createAdminClient();
  const q = query.trim();
  if (!admin || q.length < 2) return [];

  const hidden = await hiddenUserIds(excludeUserId);

  const { data } = await admin
    .from("profiles")
    .select("id, full_name, avatar_key")
    .ilike("full_name", `%${q}%`)
    .neq("id", excludeUserId)
    .limit(limit + hidden.size);

  return (data ?? [])
    .filter((p) => !hidden.has(p.id as string))
    .slice(0, limit)
    .map((p) => ({
      id: p.id as string,
      fullName: (p.full_name as string) ?? "",
      avatarKey: (p.avatar_key as string | null) ?? null,
    }));
}
