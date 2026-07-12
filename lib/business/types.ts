/**
 * Shared, framework-free types for the Business feature. Safe on client + server.
 */
import type { RoomTrack } from "@/lib/rooms/types";

export type StaffRole = "admin" | "manager";
export type BusinessRole = "owner" | StaffRole;

/** The current actor resolved against a business: owner, or invited staff. */
export interface BusinessViewer {
  businessId: string; // business_profiles.id (the owner's profile id)
  businessName: string;
  role: BusinessRole;
  staffId: string | null; // business_staff.id; null for the owner
  branchIds: string[] | "all"; // "all" for owner/admin; explicit list for manager
}

export interface Branch {
  id: string;
  roomId: string;
  slug: string;
  name: string;
  devicePairedAt: string | null;
  deviceLastSeenAt: string | null;
  archivedAt: string | null;
  createdAt: string;
}

export interface BranchNowPlaying {
  branchId: string;
  branchName: string;
  track: RoomTrack | null;
  isPlaying: boolean;
  online: boolean;
}

export interface StaffMember {
  id: string;
  email: string;
  role: StaffRole;
  invitedAt: string;
  acceptedAt: string | null;
  branchIds: string[];
}

export interface BusinessOverview {
  businessName: string;
  branchCount: number;
  onlineCount: number;
  staff: StaffMember[];
  nowPlaying: BranchNowPlaying[];
}

export interface BranchDevice {
  id: string;
  name: string;
  pairedAt: string;
  lastSeenAt: string | null;
  online: boolean;
}

/** Everything a branch's list-page card needs, in one shape. */
export interface BranchCardSummary {
  branch: Branch;
  devices: BranchDevice[];
  onlineDeviceCount: number;
  liveVisitorCount: number;
  nowPlaying: RoomTrack | null;
  isPlaying: boolean;
  lastSeenAt: string | null;
}

/** Common server-action result shape (mirrors `app/rooms/actions.ts`'s convention). */
export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };
