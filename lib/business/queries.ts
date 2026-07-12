/**
 * Server-side business reads. Uses the service-role client the same way
 * `lib/rooms/queries.ts` does — visibility/ownership is enforced here in app
 * code by always filtering on the caller's own `business_id`. SERVER ONLY.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Branch,
  BranchCardSummary,
  BranchDevice,
  BranchNowPlaying,
  BusinessOverview,
  StaffMember,
} from "@/lib/business/types";
import type { RoomTrack } from "@/lib/rooms/types";

const ONLINE_THRESHOLD_MS = 90_000;
const PRESENCE_THRESHOLD_MS = 90_000;

export function isOnline(lastSeenAt: string | null): boolean {
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

interface BranchDeviceRow {
  id: string;
  name: string;
  paired_at: string;
  last_seen_at: string | null;
}

function rowToBranchDevice(row: BranchDeviceRow): BranchDevice {
  return {
    id: row.id,
    name: row.name,
    pairedAt: row.paired_at,
    lastSeenAt: row.last_seen_at,
    online: isOnline(row.last_seen_at),
  };
}

export async function listBranchDevices(
  branchId: string,
): Promise<BranchDevice[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("branch_devices")
    .select("id, name, paired_at, last_seen_at")
    .eq("branch_id", branchId)
    .order("paired_at", { ascending: true });
  return ((data ?? []) as BranchDeviceRow[]).map(rowToBranchDevice);
}

export async function countLivePresence(roomId: string): Promise<number> {
  const admin = createAdminClient();
  if (!admin) return 0;
  const cutoff = new Date(Date.now() - PRESENCE_THRESHOLD_MS).toISOString();
  const { count } = await admin
    .from("room_presence")
    .select("actor_id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .gte("last_seen_at", cutoff);
  return count ?? 0;
}

export async function getBranchCardSummaries(
  businessId: string,
): Promise<BranchCardSummary[]> {
  const branches = await listBranches(businessId);
  if (!branches.length) return [];

  const admin = createAdminClient();
  if (!admin) {
    return branches.map((branch) => ({
      branch,
      devices: [],
      onlineDeviceCount: 0,
      liveVisitorCount: 0,
      nowPlaying: null,
      isPlaying: false,
      lastSeenAt: null,
    }));
  }

  const roomIds = branches.map((b) => b.roomId);
  const branchIds = branches.map((b) => b.id);

  const [{ data: playbackRows }, { data: deviceRows }, presenceCounts] =
    await Promise.all([
      admin
        .from("room_playback")
        .select("room_id, track, is_playing")
        .in("room_id", roomIds),
      admin
        .from("branch_devices")
        .select("id, branch_id, name, paired_at, last_seen_at")
        .in("branch_id", branchIds),
      Promise.all(roomIds.map((id) => countLivePresence(id))),
    ]);

  const playbackByRoom = new Map(
    (
      (playbackRows ?? []) as {
        room_id: string;
        track: unknown;
        is_playing: boolean;
      }[]
    ).map((p) => [p.room_id, p]),
  );
  const devicesByBranch = new Map<string, BranchDevice[]>();
  for (const row of (deviceRows ?? []) as (BranchDeviceRow & {
    branch_id: string;
  })[]) {
    const list = devicesByBranch.get(row.branch_id) ?? [];
    list.push(rowToBranchDevice(row));
    devicesByBranch.set(row.branch_id, list);
  }

  return branches.map((branch, i) => {
    const playback = playbackByRoom.get(branch.roomId);
    const devices = devicesByBranch.get(branch.id) ?? [];
    const lastSeenAt = devices.reduce<string | null>((latest, d) => {
      if (!d.lastSeenAt) return latest;
      if (!latest || d.lastSeenAt > latest) return d.lastSeenAt;
      return latest;
    }, null);
    return {
      branch,
      devices,
      onlineDeviceCount: devices.filter((d) => d.online).length,
      liveVisitorCount: presenceCounts[i] ?? 0,
      nowPlaying: (playback?.track as RoomTrack | null) ?? null,
      isPlaying: playback?.is_playing ?? false,
      lastSeenAt,
    };
  });
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
