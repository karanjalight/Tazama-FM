"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getBusinessViewer, canActOnBranch } from "@/lib/business/viewer";
import { getBranch, listBranches } from "@/lib/business/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify, randomSuffix } from "@/lib/rooms/slug";
import { ROOM_GENRES, MAX_ROOM_GENRES } from "@/lib/room-genres";
import type { ActionResult } from "@/lib/business/types";
import type { RoomTrack } from "@/lib/rooms/types";

const nameSchema = z.string().trim().min(2).max(60);

const VALID_GENRES = new Set(ROOM_GENRES.map((g) => g.value));

const genresSchema = z
  .array(z.string())
  .min(1, "Pick at least one genre.")
  .max(MAX_ROOM_GENRES)
  .refine((gs) => gs.every((g) => VALID_GENRES.has(g)), "Unknown genre.");

async function uniqueSlug(base: string): Promise<string> {
  const admin = createAdminClient();
  let slug = slugify(base) || "branch";
  for (let i = 0; i < 5; i++) {
    if (!admin) return `${slug}-${randomSuffix()}`;
    const { data } = await admin
      .from("rooms")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    slug = `${slugify(base) || "branch"}-${randomSuffix()}`;
  }
  return `${slugify(base) || "branch"}-${randomSuffix(6)}`;
}

/** Only the owner or an 'admin' may create/archive branches (not managers). */
function requireAdminLevel(
  viewer: Awaited<ReturnType<typeof getBusinessViewer>>,
): viewer is NonNullable<typeof viewer> & { role: "owner" | "admin" } {
  return !!viewer && (viewer.role === "owner" || viewer.role === "admin");
}

export async function createBranch(input: {
  name: string;
  genres: string[];
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!requireAdminLevel(viewer)) {
    return { ok: false, error: "You don't have permission to add branches." };
  }
  const parsedName = nameSchema.safeParse(input.name);
  if (!parsedName.success) {
    return { ok: false, error: "Enter a branch name (2-60 characters)." };
  }
  const parsedGenres = genresSchema.safeParse(input.genres);
  if (!parsedGenres.success) {
    return { ok: false, error: "Pick a valid set of genres." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return { ok: false, error: "Not configured (missing service-role key)." };
  }

  const slug = await uniqueSlug(parsedName.data);
  const { data: room, error: roomError } = await admin
    .from("rooms")
    .insert({
      slug,
      host_id: viewer.businessId,
      name: parsedName.data,
      about: "",
      access: "private",
      genres: parsedGenres.data,
      is_live: false,
      owner_business_id: viewer.businessId,
    })
    .select("id")
    .single();
  if (roomError || !room) {
    console.error("createBranch: rooms insert failed", roomError);
    return { ok: false, error: "Could not create the branch's room." };
  }

  const { error: playbackError } = await admin
    .from("room_playback")
    .upsert({ room_id: room.id }, { onConflict: "room_id" });
  if (playbackError) {
    console.error("createBranch: room_playback upsert failed", playbackError);
    return { ok: false, error: "Could not initialize branch playback." };
  }

  const { error: branchError } = await admin.from("branches").insert({
    business_id: viewer.businessId,
    room_id: room.id,
    name: parsedName.data,
    slug,
  });
  if (branchError) {
    console.error("createBranch: branches insert failed", branchError);
    return { ok: false, error: "Could not create the branch." };
  }

  revalidatePath("/business/branches");
  revalidatePath("/business/dashboard");
  return { ok: true };
}

export async function renameBranch(input: {
  branchId: string;
  name: string;
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }
  const parsed = nameSchema.safeParse(input.name);
  if (!parsed.success) {
    return { ok: false, error: "Enter a branch name (2-60 characters)." };
  }

  const branch = await getBranch(viewer.businessId, input.branchId);
  if (!branch) return { ok: false, error: "Branch not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  await Promise.all([
    admin.from("branches").update({ name: parsed.data }).eq("id", branch.id),
    admin.from("rooms").update({ name: parsed.data }).eq("id", branch.roomId),
  ]);

  revalidatePath("/business/branches");
  revalidatePath(`/business/branches/${branch.id}`);
  revalidatePath("/business/dashboard");
  return { ok: true };
}

export async function updateBranchGenres(input: {
  branchId: string;
  genres: string[];
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }
  const parsed = genresSchema.safeParse(input.genres);
  if (!parsed.success) {
    return { ok: false, error: "Pick a valid set of genres." };
  }

  const branch = await getBranch(viewer.businessId, input.branchId);
  if (!branch) return { ok: false, error: "Branch not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { error } = await admin
    .from("rooms")
    .update({ genres: parsed.data })
    .eq("id", branch.roomId);
  if (error) return { ok: false, error: "Could not update genres." };

  // Drop the rest of the old genre-suggested queue so the very next
  // /advance refills from the new genres instead of draining the old batch
  // first (which could otherwise take many tracks to "take effect").
  // Never touches the currently-playing track, only what's queued next.
  await admin
    .from("room_queue")
    .delete()
    .eq("room_id", branch.roomId)
    .eq("played", false)
    .is("added_by", null);

  revalidatePath(`/business/branches/${branch.id}`);
  return { ok: true };
}

export async function unpairDevice(input: {
  branchId: string;
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }
  const branch = await getBranch(viewer.businessId, input.branchId);
  if (!branch) return { ok: false, error: "Branch not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { error } = await admin
    .from("branches")
    .update({ device_paired_at: null, device_last_seen_at: null })
    .eq("id", branch.id);
  if (error) return { ok: false, error: "Could not unpair the device." };

  revalidatePath(`/business/branches/${branch.id}`);
  return { ok: true };
}

export async function archiveBranch(input: {
  branchId: string;
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!requireAdminLevel(viewer)) {
    return { ok: false, error: "You don't have permission to remove branches." };
  }
  const branch = await getBranch(viewer.businessId, input.branchId);
  if (!branch) return { ok: false, error: "Branch not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { error } = await admin
    .from("branches")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", branch.id);
  if (error) return { ok: false, error: "Could not remove the branch." };

  revalidatePath("/business/branches");
  revalidatePath("/business/dashboard");
  return { ok: true };
}

const claimSchema = z.object({
  branchId: z.string().uuid(),
  code: z.string().trim().min(4).max(8),
  name: z.string().trim().min(1, "Give this device a name.").max(40),
});

export async function claimDevice(input: {
  branchId: string;
  code: string;
  name: string;
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }
  const parsed = claimSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid pairing code." };
  }

  const branch = await getBranch(viewer.businessId, parsed.data.branchId);
  if (!branch) return { ok: false, error: "Branch not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const code = parsed.data.code.toUpperCase();
  const { data: pairing } = await admin
    .from("device_pairings")
    .select("id, expires_at, claimed_branch_id, device_token")
    .eq("code", code)
    .maybeSingle();

  if (
    !pairing ||
    pairing.claimed_branch_id ||
    new Date(pairing.expires_at).getTime() < Date.now()
  ) {
    return { ok: false, error: "That code is invalid or has expired." };
  }

  const claimedAt = new Date().toISOString();
  const { data: claimedRows, error: claimError } = await admin
    .from("device_pairings")
    .update({ claimed_branch_id: branch.id, claimed_at: claimedAt })
    .eq("id", pairing.id)
    .is("claimed_branch_id", null)
    .select("id");
  if (claimError || !claimedRows || claimedRows.length === 0) {
    return { ok: false, error: "That code was just claimed by someone else." };
  }

  // branch_devices is now the source of truth for pairing — the branch-level
  // columns are left untouched (unused going forward, not worth a destructive
  // column drop).
  const { error: deviceError } = await admin.from("branch_devices").insert({
    branch_id: branch.id,
    name: parsed.data.name,
    device_token: pairing.device_token,
  });
  if (deviceError) {
    return { ok: false, error: "Could not finish pairing this device." };
  }

  await admin
    .from("branches")
    .update({ device_paired_at: claimedAt, device_last_seen_at: claimedAt })
    .eq("id", branch.id);

  revalidatePath(`/business/branches/${branch.id}`);
  revalidatePath("/business/dashboard");
  return { ok: true };
}

export async function forgetDevice(input: {
  branchId: string;
  deviceId: string;
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }
  const branch = await getBranch(viewer.businessId, input.branchId);
  if (!branch) return { ok: false, error: "Branch not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { error } = await admin
    .from("branch_devices")
    .delete()
    .eq("id", input.deviceId)
    .eq("branch_id", branch.id);
  if (error) return { ok: false, error: "Could not forget this device." };

  revalidatePath(`/business/branches/${input.branchId}`);
  return { ok: true };
}

const trackSchema = z.object({
  youtubeId: z.string().min(5),
  title: z.string(),
  artist: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
});

export async function playToBranches(input: {
  branchIds: string[] | "all";
  track: RoomTrack;
}): Promise<
  | { ok: true; results: { branchId: string; ok: boolean }[] }
  | { ok: false; error: string }
> {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false, error: "Please sign in." };
  const parsedTrack = trackSchema.safeParse(input.track);
  if (!parsedTrack.success) {
    return { ok: false, error: "Invalid track." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const allBranches = await listBranches(viewer.businessId);
  const targets =
    input.branchIds === "all"
      ? allBranches
      : allBranches.filter((b) => input.branchIds.includes(b.id));

  const permitted = targets.filter((b) => canActOnBranch(viewer, b.id));
  if (!permitted.length) {
    return { ok: false, error: "No branches to play to." };
  }

  const results = await Promise.all(
    permitted.map(async (branch) => {
      const { error } = await admin
        .from("room_playback")
        .upsert(
          {
            room_id: branch.roomId,
            track: parsedTrack.data,
            position_ms: 0,
            is_playing: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "room_id" },
        );
      return { branchId: branch.id, ok: !error };
    }),
  );

  revalidatePath("/business/dashboard");
  return { ok: true, results };
}

const inviteSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["admin", "manager"]),
});

export async function inviteStaff(input: {
  email: string;
  role: "admin" | "manager";
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!requireAdminLevel(viewer)) {
    return { ok: false, error: "You don't have permission to invite staff." };
  }
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email and role." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { error } = await admin.from("business_staff").insert({
    business_id: viewer.businessId,
    email: parsed.data.email.toLowerCase(),
    role: parsed.data.role,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That email is already invited." };
    }
    return { ok: false, error: "Could not send the invite." };
  }

  revalidatePath("/business/staff");
  return { ok: true };
}

export async function updateStaffBranches(input: {
  staffId: string;
  branchIds: string[];
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!requireAdminLevel(viewer)) {
    return { ok: false, error: "You don't have permission to manage staff." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { data: staff } = await admin
    .from("business_staff")
    .select("id, business_id")
    .eq("id", input.staffId)
    .eq("business_id", viewer.businessId)
    .maybeSingle();
  if (!staff) return { ok: false, error: "Staff member not found." };

  const ownBranches = await listBranches(viewer.businessId);
  const ownBranchIds = new Set(ownBranches.map((b) => b.id));
  const branchIds = input.branchIds.filter((id) => ownBranchIds.has(id));

  const { data: existingRows } = await admin
    .from("business_staff_branches")
    .select("branch_id")
    .eq("staff_id", input.staffId);
  const existingIds = new Set((existingRows ?? []).map((r) => r.branch_id as string));
  const nextIds = new Set(branchIds);

  const toAdd = branchIds.filter((id) => !existingIds.has(id));
  const toRemove = [...existingIds].filter((id) => !nextIds.has(id));

  // Insert first: a failure here leaves existing assignments untouched, never
  // destroying state the way a delete-then-insert would on partial failure.
  if (toAdd.length) {
    const { error } = await admin.from("business_staff_branches").insert(
      toAdd.map((branchId) => ({ staff_id: input.staffId, branch_id: branchId })),
    );
    if (error) return { ok: false, error: "Could not update assignments." };
  }

  if (toRemove.length) {
    const { error } = await admin
      .from("business_staff_branches")
      .delete()
      .eq("staff_id", input.staffId)
      .in("branch_id", toRemove);
    if (error) return { ok: false, error: "Could not update assignments." };
  }

  revalidatePath("/business/staff");
  return { ok: true };
}

export async function revokeStaff(input: {
  staffId: string;
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!requireAdminLevel(viewer)) {
    return { ok: false, error: "You don't have permission to remove staff." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { error } = await admin
    .from("business_staff")
    .delete()
    .eq("id", input.staffId)
    .eq("business_id", viewer.businessId);
  if (error) return { ok: false, error: "Could not remove staff member." };

  revalidatePath("/business/staff");
  return { ok: true };
}

export async function removeBranchQueueItem(input: {
  branchId: string;
  queueId: string;
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }
  const branch = await getBranch(viewer.businessId, input.branchId);
  if (!branch) return { ok: false, error: "Branch not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { error } = await admin
    .from("room_queue")
    .delete()
    .eq("id", input.queueId)
    .eq("room_id", branch.roomId);
  if (error) return { ok: false, error: "Could not remove track." };

  revalidatePath(`/business/branches/${input.branchId}`);
  return { ok: true };
}

export async function setBranchPlayback(input: {
  branchId: string;
  isPlaying: boolean;
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }
  const branch = await getBranch(viewer.businessId, input.branchId);
  if (!branch) return { ok: false, error: "Branch not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  // The kiosk mirrors `room_playback` by computing
  // `positionMs + (isPlaying ? now - updatedAt : 0)` and seeking whenever
  // that drifts from where it actually is. `position_ms` is only ever
  // written at track-start (always 0) — a bare `is_playing` toggle with no
  // position update left it stale, so every pause/resume made the kiosk
  // seek back to 0 instead of holding its place. Freeze the estimated live
  // position on pause (elapsed time since the last update, while it was
  // playing) so a subsequent resume computes back to roughly the same spot.
  const { data: current } = await admin
    .from("room_playback")
    .select("position_ms, is_playing, updated_at")
    .eq("room_id", branch.roomId)
    .maybeSingle();

  let positionMs = current?.position_ms ?? 0;
  if (!input.isPlaying && current?.is_playing) {
    const elapsed = Date.now() - new Date(current.updated_at).getTime();
    positionMs = Math.max(0, positionMs + elapsed);
  }

  const { error } = await admin
    .from("room_playback")
    .update({
      is_playing: input.isPlaying,
      position_ms: positionMs,
      updated_at: new Date().toISOString(),
    })
    .eq("room_id", branch.roomId);
  if (error) return { ok: false, error: "Could not update playback." };

  revalidatePath(`/business/branches/${input.branchId}`);
  return { ok: true };
}

const createManagerSchema = z.object({
  email: z.string().trim().email(),
  phone: z.string().trim().min(7, "Enter a valid phone number."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function createBranchManager(input: {
  branchId: string;
  email: string;
  phone: string;
  password: string;
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!requireAdminLevel(viewer)) {
    return { ok: false, error: "You don't have permission to add managers." };
  }
  const parsed = createManagerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details." };
  }
  const branch = await getBranch(viewer.businessId, input.branchId);
  if (!branch) return { ok: false, error: "Branch not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const email = parsed.data.email.toLowerCase();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: email.split("@")[0], phone: parsed.data.phone },
  });
  if (createError || !created.user) {
    const message = createError?.message?.toLowerCase().includes("already")
      ? "That email is already registered."
      : "Could not create the account.";
    return { ok: false, error: message };
  }

  const { data: staffRow, error: staffError } = await admin
    .from("business_staff")
    .insert({
      business_id: viewer.businessId,
      email,
      user_id: created.user.id,
      role: "manager",
      accepted_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (staffError || !staffRow) {
    return { ok: false, error: "Account created, but could not add them as staff." };
  }

  const { error: branchLinkError } = await admin
    .from("business_staff_branches")
    .insert({ staff_id: staffRow.id, branch_id: branch.id });
  if (branchLinkError) {
    return { ok: false, error: "Account created, but could not assign the branch." };
  }

  revalidatePath("/business/staff");
  revalidatePath(`/business/branches/${input.branchId}`);
  return { ok: true };
}

export async function setBranchVolume(input: {
  branchId: string;
  volume: number;
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }
  const branch = await getBranch(viewer.businessId, input.branchId);
  if (!branch) return { ok: false, error: "Branch not found." };

  const clamped = Math.min(100, Math.max(0, Math.round(input.volume)));

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { error } = await admin
    .from("branches")
    .update({ volume: clamped })
    .eq("id", branch.id);
  if (error) return { ok: false, error: "Could not update volume." };

  revalidatePath(`/business/branches/${input.branchId}`);
  return { ok: true };
}
