/**
 * Server-side business reads. Uses the service-role client the same way
 * `lib/rooms/queries.ts` does — visibility/ownership is enforced here in app
 * code by always filtering on the caller's own `business_id`. SERVER ONLY.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Branch,
  BranchNowPlaying,
  BusinessOverview,
  StaffMember,
} from "@/lib/business/types";
import type { RoomTrack } from "@/lib/rooms/types";

const ONLINE_THRESHOLD_MS = 90_000;

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
}

interface BranchRow {
  id: string;
  room_id: string;
  slug: string;
  name: string;
  device_paired_at: string | null;
  device_last_seen_at: string | null;
  archived_at: string | null;
  created_at: string;
}

function rowToBranch(row: BranchRow): Branch {
  return {
    id: row.id,
    roomId: row.room_id,
    slug: row.slug,
    name: row.name,
    devicePairedAt: row.device_paired_at,
    deviceLastSeenAt: row.device_last_seen_at,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}

export async function listBranches(businessId: string): Promise<Branch[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("branches")
    .select("*")
    .eq("business_id", businessId)
    .is("archived_at", null)
    .order("created_at", { ascending: true });
  return ((data ?? []) as BranchRow[]).map(rowToBranch);
}

export async function getBranch(
  businessId: string,
  branchId: string,
): Promise<Branch | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("branches")
    .select("*")
    .eq("business_id", businessId)
    .eq("id", branchId)
    .maybeSingle();
  return data ? rowToBranch(data as BranchRow) : null;
}

export async function listStaff(businessId: string): Promise<StaffMember[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const { data: staffRows } = await admin
    .from("business_staff")
    .select("id, email, role, invited_at, accepted_at")
    .eq("business_id", businessId)
    .order("invited_at", { ascending: true });
  if (!staffRows?.length) return [];

  const { data: branchRows } = await admin
    .from("business_staff_branches")
    .select("staff_id, branch_id")
    .in(
      "staff_id",
      staffRows.map((s) => s.id as string),
    );

  return staffRows.map((s) => ({
    id: s.id as string,
    email: s.email as string,
    role: s.role as StaffMember["role"],
    invitedAt: s.invited_at as string,
    acceptedAt: s.accepted_at as string | null,
    branchIds: ((branchRows ?? []) as { staff_id: string; branch_id: string }[])
      .filter((b) => b.staff_id === s.id)
      .map((b) => b.branch_id),
  }));
}

export async function getBusinessOverview(
  businessId: string,
  businessName: string,
): Promise<BusinessOverview> {
  const branches = await listBranches(businessId);
  const staff = await listStaff(businessId);

  let nowPlaying: BranchNowPlaying[] = [];
  const admin = createAdminClient();
  if (admin && branches.length) {
    const { data: playback } = await admin
      .from("room_playback")
      .select("room_id, track, is_playing")
      .in(
        "room_id",
        branches.map((b) => b.roomId),
      );

    nowPlaying = branches.map((b) => {
      const row = (
        (playback ?? []) as {
          room_id: string;
          track: unknown;
          is_playing: boolean;
        }[]
      ).find((p) => p.room_id === b.roomId);
      return {
        branchId: b.id,
        branchName: b.name,
        track: (row?.track as RoomTrack | null) ?? null,
        isPlaying: row?.is_playing ?? false,
        online: isOnline(b.deviceLastSeenAt),
      };
    });
  }

  return {
    businessName,
    branchCount: branches.length,
    onlineCount: branches.filter((b) => isOnline(b.deviceLastSeenAt)).length,
    staff,
    nowPlaying,
  };
}

/** The kiosk player page needs a branch's current volume by room id — it has
 * no businessId context (it's public/unauthenticated), so this reads directly
 * by room_id rather than going through the businessId-scoped Branch queries. */
export async function getBranchVolume(roomId: string): Promise<number> {
  const admin = createAdminClient();
  if (!admin) return 80;
  const { data } = await admin
    .from("branches")
    .select("volume")
    .eq("room_id", roomId)
    .maybeSingle();
  return typeof data?.volume === "number" ? data.volume : 80;
}
