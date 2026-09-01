"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getBusinessViewer } from "@/lib/business/viewer";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getAnnouncement } from "@/lib/business/announcement-queries";
import { uploadAnnouncementAudio, deleteAnnouncementAudio } from "@/lib/business/announcement-storage";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CATEGORIES,
  categoryToDb,
  type AnnouncementCategory,
  type AnnouncementTarget,
} from "@/lib/business/announcement-types";
import type { ActionResult } from "@/lib/business/types";

const ANNOUNCEMENTS_PATH = "/business/announcements";

const titleSchema = z.string().trim().min(1, "Give this a title.").max(120);
const descriptionSchema = z.string().trim().max(2000);
const categorySchema = z.enum([...CATEGORIES] as [AnnouncementCategory, ...AnnouncementCategory[]]);
const playbackModeSchema = z.enum(["pause", "reduce"]);
const repeatSchema = z.enum(["none", "daily", "weekdays", "weekends", "weekly", "custom"]);
const sendModeSchema = z.enum(["now", "schedule"]);
const uuidArraySchema = z.array(z.string().uuid());
const targetSchema = z.object({
  locationIds: uuidArraySchema,
  zoneIds: uuidArraySchema,
  roomIds: uuidArraySchema,
  audioZoneIds: uuidArraySchema,
});

function clampPercent(raw: FormDataEntryValue | null): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return 20;
  return Math.min(100, Math.max(0, n));
}

function parseTarget(raw: FormDataEntryValue | null): AnnouncementTarget | null {
  if (typeof raw !== "string") return null;
  try {
    const parsed = targetSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function durationSecondsFromLabel(label: string): number {
  const [m, s] = label.split(":").map(Number);
  return (m || 0) * 60 + (s || 0);
}

type ParsedFields =
  | { ok: true; value: { title: string; categoryDb: string; description: string; playbackMode: "pause" | "reduce"; reducedVolumePercent: number; durationSeconds: number; repeat: "none" | "daily" | "weekdays" | "weekends" | "weekly" | "custom"; sendMode: "now" | "schedule"; scheduledAt: string | null; target: AnnouncementTarget } }
  | { ok: false; error: string };

/** Shared field parsing for create + update — everything except the file
 * itself (create requires one, update treats an absent one as "keep the
 * existing audio", so the two callers handle the file differently). */
function parseAnnouncementFields(formData: FormData): ParsedFields {
  const title = formData.get("title");
  const category = formData.get("category");
  const description = formData.get("description");
  const playbackMode = formData.get("playbackMode");
  const repeat = formData.get("repeat");
  const sendMode = formData.get("sendMode");
  const scheduledAtRaw = formData.get("scheduledAt");
  const targetRaw = formData.get("target");

  if (
    typeof title !== "string" ||
    typeof category !== "string" ||
    typeof description !== "string" ||
    typeof playbackMode !== "string" ||
    typeof repeat !== "string" ||
    typeof sendMode !== "string"
  ) {
    return { ok: false, error: "Missing required fields." };
  }

  const parsedTitle = titleSchema.safeParse(title);
  if (!parsedTitle.success) return { ok: false, error: parsedTitle.error.issues[0]?.message ?? "Invalid title." };
  const parsedCategory = categorySchema.safeParse(category);
  if (!parsedCategory.success) return { ok: false, error: "Invalid category." };
  const parsedDescription = descriptionSchema.safeParse(description);
  const parsedPlayback = playbackModeSchema.safeParse(playbackMode);
  if (!parsedPlayback.success) return { ok: false, error: "Invalid playback mode." };
  const parsedRepeat = repeatSchema.safeParse(repeat);
  if (!parsedRepeat.success) return { ok: false, error: "Invalid repeat option." };
  const parsedSendMode = sendModeSchema.safeParse(sendMode);
  if (!parsedSendMode.success) return { ok: false, error: "Invalid send mode." };

  const target = parseTarget(targetRaw);
  if (!target) return { ok: false, error: "Invalid target selection." };
  if (!target.locationIds.length && !target.zoneIds.length && !target.roomIds.length && !target.audioZoneIds.length) {
    return { ok: false, error: "Select at least one location, zone, room, or audio zone." };
  }

  if (parsedSendMode.data === "schedule" && typeof scheduledAtRaw !== "string") {
    return { ok: false, error: "Choose a date and time to schedule this announcement." };
  }

  return {
    ok: true,
    value: {
      title: parsedTitle.data,
      categoryDb: categoryToDb(parsedCategory.data),
      description: parsedDescription.success ? parsedDescription.data : "",
      playbackMode: parsedPlayback.data,
      reducedVolumePercent: clampPercent(formData.get("reducedVolumePercent")),
      durationSeconds: Math.max(0, Math.round(Number(formData.get("durationSeconds")) || 0)),
      repeat: parsedRepeat.data,
      sendMode: parsedSendMode.data,
      scheduledAt: parsedSendMode.data === "schedule" ? (scheduledAtRaw as string) : null,
      target,
    },
  };
}

async function writeTargetRows(
  admin: SupabaseClient,
  announcementId: string,
  target: AnnouncementTarget,
): Promise<boolean> {
  const inserts: PromiseLike<{ error: unknown }>[] = [];
  if (target.locationIds.length) {
    inserts.push(
      admin
        .from("announcement_target_locations")
        .insert(target.locationIds.map((branch_id) => ({ announcement_id: announcementId, branch_id }))),
    );
  }
  if (target.zoneIds.length) {
    inserts.push(
      admin
        .from("announcement_target_zones")
        .insert(target.zoneIds.map((zone_id) => ({ announcement_id: announcementId, zone_id }))),
    );
  }
  if (target.roomIds.length) {
    inserts.push(
      admin
        .from("announcement_target_rooms")
        .insert(target.roomIds.map((room_id) => ({ announcement_id: announcementId, room_id }))),
    );
  }
  if (target.audioZoneIds.length) {
    inserts.push(
      admin
        .from("announcement_target_audio_zones")
        .insert(target.audioZoneIds.map((audio_zone_id) => ({ announcement_id: announcementId, audio_zone_id }))),
    );
  }
  const results = await Promise.all(inserts);
  return results.every((r) => !r.error);
}

async function clearTargetRows(admin: SupabaseClient, announcementId: string): Promise<void> {
  await Promise.all([
    admin.from("announcement_target_locations").delete().eq("announcement_id", announcementId),
    admin.from("announcement_target_zones").delete().eq("announcement_id", announcementId),
    admin.from("announcement_target_rooms").delete().eq("announcement_id", announcementId),
    admin.from("announcement_target_audio_zones").delete().eq("announcement_id", announcementId),
  ]);
}

/** Best-effort delete of an audio Storage object — but only when no other
 * announcement (e.g. one created via Duplicate) still points at the same
 * path, since duplicates intentionally share their source's audio file. */
async function cleanupAudioIfUnreferenced(
  admin: SupabaseClient,
  businessId: string,
  audioPath: string,
  excludeId: string,
): Promise<void> {
  const { data } = await admin
    .from("announcements")
    .select("id")
    .eq("business_id", businessId)
    .eq("audio_path", audioPath)
    .neq("id", excludeId)
    .limit(1);
  if (!data?.length) await deleteAnnouncementAudio(audioPath);
}

export async function createAnnouncement(formData: FormData): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false, error: "Please sign in." };

  const parsed = parseAnnouncementFields(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const file = formData.get("audioFile");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Record or upload audio first." };
  }

  const uploaded = await uploadAnnouncementAudio(viewer.businessId, file);
  if (!uploaded) return { ok: false, error: "Could not upload the audio — check its size and format." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured (missing service-role key)." };

  const profile = await getCurrentProfile();
  const now = new Date().toISOString();
  const { title, categoryDb, description, playbackMode, reducedVolumePercent, durationSeconds, repeat, sendMode, scheduledAt, target } =
    parsed.value;
  const sent = sendMode === "now";

  const { data: inserted, error } = await admin
    .from("announcements")
    .insert({
      business_id: viewer.businessId,
      title,
      category: categoryDb,
      description,
      audio_path: uploaded.path,
      duration_seconds: durationSeconds,
      playback_mode: playbackMode,
      reduced_volume_percent: reducedVolumePercent,
      status: sent ? "sent" : "scheduled",
      repeat,
      scheduled_at: sent ? null : scheduledAt,
      sent_at: sent ? now : null,
      sent_by: sent ? (profile?.id ?? null) : null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("createAnnouncement: insert failed", error);
    await deleteAnnouncementAudio(uploaded.path);
    return { ok: false, error: "Could not save the announcement." };
  }

  const targetOk = await writeTargetRows(admin, inserted.id as string, target);
  if (!targetOk) {
    await admin.from("announcements").delete().eq("id", inserted.id);
    await deleteAnnouncementAudio(uploaded.path);
    return { ok: false, error: "Could not save the announcement's target." };
  }

  revalidatePath(ANNOUNCEMENTS_PATH);
  return { ok: true };
}

export async function updateAnnouncement(formData: FormData): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false, error: "Please sign in." };

  const id = formData.get("id");
  if (typeof id !== "string") return { ok: false, error: "Missing announcement id." };

  const existing = await getAnnouncement(viewer.businessId, id);
  if (!existing) return { ok: false, error: "Announcement not found." };

  const parsed = parseAnnouncementFields(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const { title, categoryDb, description, playbackMode, reducedVolumePercent, durationSeconds, repeat, sendMode, scheduledAt, target } =
    parsed.value;

  let audioPath = existing.audioPath ?? null;
  let newlyUploadedPath: string | null = null;
  const file = formData.get("audioFile");
  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadAnnouncementAudio(viewer.businessId, file);
    if (!uploaded) return { ok: false, error: "Could not upload the audio — check its size and format." };
    newlyUploadedPath = uploaded.path;
    audioPath = uploaded.path;
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const profile = await getCurrentProfile();
  const now = new Date().toISOString();
  const sent = sendMode === "now";

  const { error } = await admin
    .from("announcements")
    .update({
      title,
      category: categoryDb,
      description,
      audio_path: audioPath,
      duration_seconds: durationSeconds,
      playback_mode: playbackMode,
      reduced_volume_percent: reducedVolumePercent,
      status: sent ? "sent" : "scheduled",
      repeat,
      scheduled_at: sent ? null : scheduledAt,
      sent_at: sent ? now : null,
      sent_by: sent ? (profile?.id ?? null) : null,
    })
    .eq("id", id)
    .eq("business_id", viewer.businessId);

  if (error) {
    if (newlyUploadedPath) await deleteAnnouncementAudio(newlyUploadedPath);
    return { ok: false, error: "Could not update the announcement." };
  }

  await clearTargetRows(admin, id);
  const targetOk = await writeTargetRows(admin, id, target);
  if (!targetOk) {
    return { ok: false, error: "Announcement saved, but its target couldn't be fully updated." };
  }

  if (newlyUploadedPath && existing.audioPath && existing.audioPath !== newlyUploadedPath) {
    await cleanupAudioIfUnreferenced(admin, viewer.businessId, existing.audioPath, id);
  }

  revalidatePath(ANNOUNCEMENTS_PATH);
  return { ok: true };
}

export async function deleteAnnouncement(input: { businessId: string; id: string }): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false, error: "Please sign in." };

  const item = await getAnnouncement(viewer.businessId, input.id);
  if (!item) return { ok: false, error: "Announcement not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { error } = await admin
    .from("announcements")
    .delete()
    .eq("id", item.id)
    .eq("business_id", viewer.businessId);
  if (error) return { ok: false, error: "Could not delete the announcement." };

  // The 4 target join tables + announcement_deliveries cascade-delete from
  // announcements — no manual link-row cleanup needed.
  if (item.audioPath) await cleanupAudioIfUnreferenced(admin, viewer.businessId, item.audioPath, item.id);

  revalidatePath(ANNOUNCEMENTS_PATH);
  return { ok: true };
}

export async function duplicateAnnouncement(input: { businessId: string; id: string }): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer) return { ok: false, error: "Please sign in." };

  const source = await getAnnouncement(viewer.businessId, input.id);
  if (!source) return { ok: false, error: "Announcement not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { data: inserted, error } = await admin
    .from("announcements")
    .insert({
      business_id: viewer.businessId,
      title: `${source.title} (Copy)`,
      category: categoryToDb(source.category),
      description: source.description,
      // Shares the source's audio file rather than copying it — deleting
      // either copy only removes the Storage object once nothing else
      // references it (see cleanupAudioIfUnreferenced).
      audio_path: source.audioPath ?? null,
      duration_seconds: durationSecondsFromLabel(source.duration),
      playback_mode: source.playbackMode,
      reduced_volume_percent: source.reducedVolumePercent,
      status: "draft",
      repeat: source.repeat ?? "none",
      scheduled_at: null,
      sent_at: null,
      sent_by: null,
    })
    .select("id")
    .single();

  if (error || !inserted) return { ok: false, error: "Could not duplicate the announcement." };

  const targetOk = await writeTargetRows(admin, inserted.id as string, source.target);
  if (!targetOk) {
    await admin.from("announcements").delete().eq("id", inserted.id);
    return { ok: false, error: "Could not duplicate the announcement's target." };
  }

  revalidatePath(ANNOUNCEMENTS_PATH);
  return { ok: true };
}
