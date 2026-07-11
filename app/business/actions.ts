"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getBusinessViewer, canActOnBranch } from "@/lib/business/viewer";
import { getBranch, listBranches } from "@/lib/business/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify, randomSuffix } from "@/lib/rooms/slug";
import type { ActionResult } from "@/lib/business/types";
import type { RoomTrack } from "@/lib/rooms/types";

const nameSchema = z.string().trim().min(2).max(60);

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
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!requireAdminLevel(viewer)) {
    return { ok: false, error: "You don't have permission to add branches." };
  }
  const parsed = nameSchema.safeParse(input.name);
  if (!parsed.success) {
    return { ok: false, error: "Enter a branch name (2-60 characters)." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return { ok: false, error: "Not configured (missing service-role key)." };
  }

  const slug = await uniqueSlug(parsed.data);
  const { data: room, error: roomError } = await admin
    .from("rooms")
    .insert({
      slug,
      host_id: viewer.businessId,
      host_name: viewer.businessName,
      name: parsed.data,
      about: "",
      access: "private",
      genres: [],
      is_live: false,
      owner_business_id: viewer.businessId,
    })
    .select("id")
    .single();
  if (roomError || !room) {
    return { ok: false, error: "Could not create the branch's room." };
  }

  const { error: playbackError } = await admin
    .from("room_playback")
    .upsert({ room_id: room.id }, { onConflict: "room_id" });
  if (playbackError) {
    return { ok: false, error: "Could not initialize branch playback." };
  }

  const { error: branchError } = await admin.from("branches").insert({
    business_id: viewer.businessId,
    room_id: room.id,
    name: parsed.data,
    slug,
  });
  if (branchError) {
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
});

export async function claimDevice(input: {
  branchId: string;
  code: string;
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
    .select("id, expires_at, claimed_branch_id")
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

  await admin
    .from("branches")
    .update({ device_paired_at: claimedAt, device_last_seen_at: claimedAt })
    .eq("id", branch.id);

  revalidatePath(`/business/branches/${branch.id}`);
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
          },
          { onConflict: "room_id" },
        );
      return { branchId: branch.id, ok: !error };
    }),
  );

  return { ok: true, results };
}
