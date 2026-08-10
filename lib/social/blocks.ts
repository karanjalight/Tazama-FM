/** Block-list data layer. SERVER ONLY — writes via the service-role client. */
import { createAdminClient } from "@/lib/supabase/admin";

export async function blockUser(blockerId: string, blockedId: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin || !blockerId || !blockedId || blockerId === blockedId) return false;

  const { error } = await admin
    .from("blocked_users")
    .upsert(
      { blocker_id: blockerId, blocked_id: blockedId },
      { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
    );
  return !error;
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  const { error } = await admin
    .from("blocked_users")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  return !error;
}

/** True if either user has blocked the other. */
export async function isBlockedEitherWay(userA: string, userB: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;

  const { data } = await admin
    .from("blocked_users")
    .select("blocker_id")
    .or(
      `and(blocker_id.eq.${userA},blocked_id.eq.${userB}),and(blocker_id.eq.${userB},blocked_id.eq.${userA})`,
    )
    .limit(1);
  return (data?.length ?? 0) > 0;
}

/** Ids the given user has blocked (for a "manage blocks" view; not needed yet, but cheap). */
export async function listBlockedIds(userId: string): Promise<string[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from("blocked_users")
    .select("blocked_id")
    .eq("blocker_id", userId);
  return (data ?? []).map((r) => r.blocked_id as string);
}
