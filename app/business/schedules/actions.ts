"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getBusinessViewer, canActOnBranch } from "@/lib/business/viewer";
import { getBranch } from "@/lib/business/queries";
import { getSchedule, getScheduleTargetsByIds } from "@/lib/business/schedule-queries";
import { getContentItemsByIds } from "@/lib/business/content-queries";
import { getTrackDurations, ensureGenreSeeded, upsertTracksFromYouTube, type Track } from "@/lib/tracks";
import type { YouTubeTrack } from "@/lib/youtube/search";
import { playlistDurationSummary, contentDurationSummary, formatDurationSeconds } from "@/lib/business/schedule-duration";
import { advanceScheduleTrack, advanceScheduleContent, advanceScheduleTrackTo } from "@/lib/business/schedule-playback";
import type { RoomTrack } from "@/lib/rooms/types";
import { computeFrozenPosition } from "@/lib/business/playback-freeze";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/business/types";
import type { Schedule, ScheduleTargets } from "@/lib/business/schedule-types";

function schedulesPath(branchId: string): string {
  return `/business/branches/${branchId}/schedules`;
}

// ── Shared schemas ───────────────────────────────────────────────────────

const prioritySchema = z.enum(["low", "normal", "high", "critical"]);
const screenModeSchema = z.enum(["all", "specific"]);
const recurrenceSchema = z.enum(["none", "daily", "weekdays", "weekends", "weekly", "monthly", "custom"]);
const activationModeSchema = z.enum(["now", "scheduled"]);
const statusSchema = z.enum(["draft", "active", "paused"]);
const dateSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const timeSchema = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM format.");
const uuidArraySchema = z.array(z.string().uuid());

// ── Target validation / persistence (shared by create + update) ─────────

/** Every branch a set of targets touches, directly or via a zone/room/screen
 * — the viewer must be allowed to act on all of them, not just the route's
 * own branch (a schedule can target more than one location). */
async function assertViewerCanTargetAll(
  viewer: NonNullable<Awaited<ReturnType<typeof getBusinessViewer>>>,
  admin: SupabaseClient,
  targets: { branchIds: string[]; zoneIds: string[]; roomIds: string[]; deviceIds: string[] },
): Promise<string | null> {
  const branchIdsToCheck = new Set(targets.branchIds);

  if (targets.zoneIds.length) {
    const { data } = await admin.from("zones").select("id, branch_id").in("id", targets.zoneIds);
    for (const row of (data ?? []) as { id: string; branch_id: string }[]) branchIdsToCheck.add(row.branch_id);
  }
  if (targets.roomIds.length) {
    const { data } = await admin.from("rooms").select("id, branch_id").in("id", targets.roomIds);
    for (const row of (data ?? []) as { id: string; branch_id: string | null }[]) {
      if (row.branch_id) branchIdsToCheck.add(row.branch_id);
    }
  }
  if (targets.deviceIds.length) {
    const { data } = await admin.from("branch_devices").select("id, branch_id").in("id", targets.deviceIds);
    for (const row of (data ?? []) as { id: string; branch_id: string }[]) branchIdsToCheck.add(row.branch_id);
  }

  for (const branchId of branchIdsToCheck) {
    if (!canActOnBranch(viewer, branchId)) return "You don't have access to one of the targeted locations.";
  }
  return null;
}

async function replaceScheduleTargets(
  admin: SupabaseClient,
  scheduleId: string,
  targets: { branchIds: string[]; zoneIds: string[]; roomIds: string[]; deviceIds: string[] },
): Promise<boolean> {
  const deletes = await Promise.all([
    admin.from("schedule_target_locations").delete().eq("schedule_id", scheduleId),
    admin.from("schedule_target_zones").delete().eq("schedule_id", scheduleId),
    admin.from("schedule_target_rooms").delete().eq("schedule_id", scheduleId),
    admin.from("schedule_target_screens").delete().eq("schedule_id", scheduleId),
  ]);
  if (deletes.some((d) => d.error)) return false;

  const inserts = await Promise.all([
    targets.branchIds.length
      ? admin.from("schedule_target_locations").insert(targets.branchIds.map((branch_id) => ({ schedule_id: scheduleId, branch_id })))
      : Promise.resolve({ error: null }),
    targets.zoneIds.length
      ? admin.from("schedule_target_zones").insert(targets.zoneIds.map((zone_id) => ({ schedule_id: scheduleId, zone_id })))
      : Promise.resolve({ error: null }),
    targets.roomIds.length
      ? admin.from("schedule_target_rooms").insert(targets.roomIds.map((room_id) => ({ schedule_id: scheduleId, room_id })))
      : Promise.resolve({ error: null }),
    targets.deviceIds.length
      ? admin.from("schedule_target_screens").insert(targets.deviceIds.map((device_id) => ({ schedule_id: scheduleId, device_id })))
      : Promise.resolve({ error: null }),
  ]);
  return !inserts.some((i) => i.error);
}

// ── Create / update / delete ─────────────────────────────────────────────

const scheduleFieldsSchema = z.object({
  name: z.string().trim().min(2, "Give this schedule a name.").max(80),
  description: z.string().trim().max(500).optional(),
  priority: prioritySchema.optional(),
  tags: z.array(z.string().trim().max(30)).max(10).optional(),
  color: z.string().trim().max(20).nullable().optional(),
  notes: z.string().trim().max(1000).optional(),
  overrideExisting: z.boolean().optional(),
  screenMode: screenModeSchema.optional(),
  synchronizedPlayback: z.boolean().optional(),
  startDate: dateSchema,
  endDate: dateSchema.nullable().optional(),
  recurrence: recurrenceSchema.optional(),
  customDays: z.array(z.string()).optional(),
  timezone: z.string().trim().max(60).optional(),
  activation: activationModeSchema.optional(),
  scheduledStartAt: z.string().trim().nullable().optional(),
  branchIds: uuidArraySchema.optional(),
  zoneIds: uuidArraySchema.optional(),
  roomIds: uuidArraySchema.optional(),
  deviceIds: uuidArraySchema.optional(),
});

const createScheduleSchema = scheduleFieldsSchema.extend({ branchId: z.string().uuid() });

export type CreateScheduleResult = { ok: true; scheduleId: string } | { ok: false; error: string };

export async function createSchedule(
  input: z.infer<typeof createScheduleSchema>,
): Promise<CreateScheduleResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }
  const parsed = createScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid schedule details." };
  }

  const branch = await getBranch(viewer.businessId, parsed.data.branchId);
  if (!branch) return { ok: false, error: "Branch not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  // The route's own branch always counts as a target, even if Step 2 didn't
  // explicitly re-select it — a schedule launched from a branch's own
  // Schedules page should always at least be discoverable from there.
  const branchIds = [...new Set([parsed.data.branchId, ...(parsed.data.branchIds ?? [])])];
  const zoneIds = parsed.data.zoneIds ?? [];
  const roomIds = parsed.data.roomIds ?? [];
  const deviceIds = parsed.data.screenMode === "specific" ? (parsed.data.deviceIds ?? []) : [];

  const targetError = await assertViewerCanTargetAll(viewer, admin, { branchIds, zoneIds, roomIds, deviceIds });
  if (targetError) return { ok: false, error: targetError };

  const { data: inserted, error } = await admin
    .from("schedules")
    .insert({
      business_id: viewer.businessId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      priority: parsed.data.priority ?? "normal",
      tags: parsed.data.tags ?? [],
      color: parsed.data.color ?? null,
      notes: parsed.data.notes || null,
      override_existing: parsed.data.overrideExisting ?? false,
      screen_mode: parsed.data.screenMode ?? "all",
      synchronized_playback: parsed.data.synchronizedPlayback ?? false,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate ?? null,
      recurrence: parsed.data.recurrence ?? "none",
      custom_days: parsed.data.customDays ?? [],
      timezone: parsed.data.timezone || branch.timezone || "Africa/Nairobi",
      activation: parsed.data.activation ?? "now",
      scheduled_start_at: parsed.data.scheduledStartAt || null,
      status: "draft",
    })
    .select("id")
    .single();
  if (error || !inserted) {
    console.error("createSchedule: insert failed", error);
    return { ok: false, error: "Could not create the schedule." };
  }

  const targetsOk = await replaceScheduleTargets(admin, inserted.id, { branchIds, zoneIds, roomIds, deviceIds });
  if (!targetsOk) {
    await admin.from("schedules").delete().eq("id", inserted.id);
    return { ok: false, error: "Could not assign targets to the schedule." };
  }

  revalidatePath(schedulesPath(parsed.data.branchId));
  return { ok: true, scheduleId: inserted.id };
}

const updateScheduleSchema = scheduleFieldsSchema.partial().extend({
  branchId: z.string().uuid(),
  id: z.string().uuid(),
});

export async function updateSchedule(input: z.infer<typeof updateScheduleSchema>): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }
  const parsed = updateScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid update." };
  }

  const schedule = await getSchedule(parsed.data.branchId, parsed.data.id);
  if (!schedule) return { ok: false, error: "Schedule not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const hasTargetChange =
    parsed.data.branchIds !== undefined ||
    parsed.data.zoneIds !== undefined ||
    parsed.data.roomIds !== undefined ||
    parsed.data.deviceIds !== undefined ||
    parsed.data.screenMode !== undefined;

  if (hasTargetChange) {
    const branchIds = parsed.data.branchIds ?? schedule.branchIds;
    const zoneIds = parsed.data.zoneIds ?? schedule.zoneIds;
    const roomIds = parsed.data.roomIds ?? schedule.roomIds;
    const screenMode = parsed.data.screenMode ?? schedule.screenMode;
    const deviceIds = screenMode === "specific" ? (parsed.data.deviceIds ?? schedule.deviceIds) : [];

    const targetError = await assertViewerCanTargetAll(viewer, admin, { branchIds, zoneIds, roomIds, deviceIds });
    if (targetError) return { ok: false, error: targetError };

    const targetsOk = await replaceScheduleTargets(admin, schedule.id, { branchIds, zoneIds, roomIds, deviceIds });
    if (!targetsOk) return { ok: false, error: "Schedule saved, but its targets couldn't be fully updated." };
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description || null;
  if (parsed.data.priority !== undefined) patch.priority = parsed.data.priority;
  if (parsed.data.tags !== undefined) patch.tags = parsed.data.tags;
  if (parsed.data.color !== undefined) patch.color = parsed.data.color;
  if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes || null;
  if (parsed.data.overrideExisting !== undefined) patch.override_existing = parsed.data.overrideExisting;
  if (parsed.data.screenMode !== undefined) patch.screen_mode = parsed.data.screenMode;
  if (parsed.data.synchronizedPlayback !== undefined) patch.synchronized_playback = parsed.data.synchronizedPlayback;
  if (parsed.data.startDate !== undefined) patch.start_date = parsed.data.startDate;
  if (parsed.data.endDate !== undefined) patch.end_date = parsed.data.endDate;
  if (parsed.data.recurrence !== undefined) patch.recurrence = parsed.data.recurrence;
  if (parsed.data.customDays !== undefined) patch.custom_days = parsed.data.customDays;
  if (parsed.data.timezone !== undefined) patch.timezone = parsed.data.timezone;
  if (parsed.data.activation !== undefined) patch.activation = parsed.data.activation;
  if (parsed.data.scheduledStartAt !== undefined) patch.scheduled_start_at = parsed.data.scheduledStartAt || null;

  if (Object.keys(patch).length > 0) {
    const { error } = await admin.from("schedules").update(patch).eq("id", schedule.id);
    if (error) {
      console.error("updateSchedule: update failed", error);
      return { ok: false, error: "Could not update the schedule." };
    }
  }

  revalidatePath(schedulesPath(parsed.data.branchId));
  return { ok: true };
}

export async function deleteSchedule(input: { branchId: string; id: string }): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }
  const schedule = await getSchedule(input.branchId, input.id);
  if (!schedule) return { ok: false, error: "Schedule not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  // schedule_target_* / schedule_sessions (and their own content/ad/song
  // children) / schedule_playback all cascade-delete from schedules — no
  // manual cleanup needed.
  const { error } = await admin.from("schedules").delete().eq("id", schedule.id);
  if (error) {
    console.error("deleteSchedule: delete failed", error);
    return { ok: false, error: "Could not delete the schedule." };
  }

  revalidatePath(schedulesPath(input.branchId));
  return { ok: true };
}

// ── Sessions (Step 3's "whole day" save) ─────────────────────────────────

const sessionInputSchema = z
  .object({
    label: z.string().trim().min(1, "Give this session a label.").max(60),
    startTime: timeSchema,
    endTime: timeSchema,
    transition: z.enum(["fade", "cut", "slide", "dissolve"]).default("fade"),
    contentEnabled: z.boolean(),
    contentOrder: z.enum(["listed", "shuffle"]).default("listed"),
    fit: z.enum(["fill", "fit", "stretch"]).default("fill"),
    backgroundColor: z.string().trim().max(20).nullable().optional(),
    contentRepeat: z.enum(["loop", "once"]).default("loop"),
    contentFrequencyMode: z.enum(["continuous", "periodic"]).default("continuous"),
    contentFrequencyIntervalMinutes: z.number().int().positive().nullable().optional(),
    content: z
      .array(z.object({ contentItemId: z.string().uuid(), displaySeconds: z.number().int().positive().nullable().optional() }))
      .max(200)
      .default([]),
    playlistEnabled: z.boolean(),
    genres: z.array(z.string()).max(20).default([]),
    contentPlaylistInteraction: z.enum(["background", "pause-music"]).default("background"),
    songs: z.array(z.object({ trackId: z.string().uuid() })).max(1000).default([]),
    adsEnabled: z.boolean(),
    adFrequency: z.string().trim().max(60).nullable().optional(),
    adMaxPlaysPerDay: z.number().int().positive().nullable().optional(),
    adPosition: z.enum(["any", "strategic", "end-of-playlist", "beginning-of-playlist"]).nullable().optional(),
    adMinSpacingEnabled: z.boolean(),
    adMinSpacingMinutes: z.number().int().positive().nullable().optional(),
    adNoRepeatEnabled: z.boolean(),
    adNoRepeatMinutes: z.number().int().positive().nullable().optional(),
    respectOfflineTime: z.boolean(),
    ads: z.array(z.object({ contentItemId: z.string().uuid() })).max(200).default([]),
  })
  .refine((s) => s.startTime < s.endTime, { message: "A session's end time must be after its start time." });

const replaceSessionsSchema = z.object({
  branchId: z.string().uuid(),
  scheduleId: z.string().uuid(),
  sessions: z.array(sessionInputSchema).max(48),
});

export type ReplaceSessionsResult = { ok: true; warnings: string[] } | { ok: false; error: string };

async function replaceSessionsRows(
  admin: SupabaseClient,
  scheduleId: string,
  sessions: z.infer<typeof sessionInputSchema>[],
): Promise<{ id: string; position: number }[] | null> {
  const { error: delError } = await admin.from("schedule_sessions").delete().eq("schedule_id", scheduleId);
  if (delError) return null;
  if (!sessions.length) return [];

  const { error: insError } = await admin.from("schedule_sessions").insert(
    sessions.map((s, i) => ({
      schedule_id: scheduleId,
      label: s.label,
      position: i,
      start_time: s.startTime,
      end_time: s.endTime,
      transition: s.transition,
      content_enabled: s.contentEnabled,
      content_order: s.contentOrder,
      fit: s.fit,
      background_color: s.backgroundColor ?? null,
      content_repeat: s.contentRepeat,
      content_frequency_mode: s.contentFrequencyMode,
      content_frequency_interval_minutes: s.contentFrequencyIntervalMinutes ?? null,
      playlist_enabled: s.playlistEnabled,
      genres: s.genres,
      content_playlist_interaction: s.contentPlaylistInteraction,
      ads_enabled: s.adsEnabled,
      ad_frequency: s.adFrequency || null,
      ad_max_plays_per_day: s.adMaxPlaysPerDay ?? null,
      ad_position: s.adPosition ?? null,
      ad_min_spacing_enabled: s.adMinSpacingEnabled,
      ad_min_spacing_minutes: s.adMinSpacingMinutes ?? null,
      ad_no_repeat_enabled: s.adNoRepeatEnabled,
      ad_no_repeat_minutes: s.adNoRepeatMinutes ?? null,
      respect_offline_time: s.respectOfflineTime,
    })),
  );
  if (insError) return null;

  const { data: rows } = await admin
    .from("schedule_sessions")
    .select("id, position")
    .eq("schedule_id", scheduleId)
    .order("position", { ascending: true });
  return (rows ?? []) as { id: string; position: number }[];
}

export async function replaceScheduleSessions(input: {
  branchId: string;
  scheduleId: string;
  sessions: z.infer<typeof sessionInputSchema>[];
}): Promise<ReplaceSessionsResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }
  const parsed = replaceSessionsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid session details." };
  }

  const schedule = await getSchedule(parsed.data.branchId, parsed.data.scheduleId);
  if (!schedule) return { ok: false, error: "Schedule not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  const { sessions } = parsed.data;

  // Duration-vs-window validation — informational only (a schedule can be
  // saved short/over and finished later), computed with the exact same
  // shared helper the wizard's own live readout uses.
  const trackIds = [...new Set(sessions.flatMap((s) => s.songs.map((sg) => sg.trackId)))];
  const contentItemIds = [...new Set(sessions.flatMap((s) => [...s.content, ...s.ads].map((c) => c.contentItemId)))];
  const [durationByTrackId, contentItemsById] = await Promise.all([
    getTrackDurations(admin, trackIds),
    getContentItemsByIds(viewer.businessId, contentItemIds),
  ]);

  const warnings: string[] = [];
  sessions.forEach((s, i) => {
    const label = s.label || `Session ${i + 1}`;
    if (s.playlistEnabled) {
      const summary = playlistDurationSummary({
        startTime: s.startTime,
        endTime: s.endTime,
        playlistEnabled: s.playlistEnabled,
        songs: s.songs.map((sg) => ({ durationSeconds: durationByTrackId.get(sg.trackId) ?? null })),
      });
      if (summary.status === "short" && summary.remainingSeconds !== null) {
        warnings.push(`${label}: playlist is ${formatDurationSeconds(summary.remainingSeconds)} short of the session's window.`);
      } else if (summary.status === "over" && summary.remainingSeconds !== null) {
        warnings.push(`${label}: playlist runs ${formatDurationSeconds(-summary.remainingSeconds)} longer than the session's window.`);
      }
    }
    if (s.contentEnabled && s.contentRepeat === "once") {
      const summary = contentDurationSummary({
        startTime: s.startTime,
        endTime: s.endTime,
        contentEnabled: s.contentEnabled,
        contentRepeat: s.contentRepeat,
        content: s.content.map((c) => ({ durationSeconds: c.displaySeconds ?? contentItemsById.get(c.contentItemId)?.durationSeconds ?? null })),
      });
      if (summary.status === "short" && summary.remainingSeconds !== null) {
        warnings.push(`${label}: content is ${formatDurationSeconds(summary.remainingSeconds)} short of the session's window.`);
      } else if (summary.status === "over" && summary.remainingSeconds !== null) {
        warnings.push(`${label}: content runs ${formatDurationSeconds(-summary.remainingSeconds)} longer than the session's window.`);
      }
    }
  });

  // Overlap re-check server-side (the wizard's own day-timeline already
  // prevents this client-side via findOverlappingSession, but the action
  // layer never trusts client-only validation).
  const sorted = [...sessions].sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startTime < sorted[i - 1].endTime) {
      return { ok: false, error: `"${sorted[i].label}" overlaps with "${sorted[i - 1].label}".` };
    }
  }

  const sessionIdRows = await replaceSessionsRows(admin, schedule.id, sessions);
  if (!sessionIdRows) return { ok: false, error: "Could not save the day's sessions." };

  const contentRows: { session_id: string; content_item_id: string; position: number; display_seconds: number | null }[] = [];
  const adRows: { session_id: string; content_item_id: string; position: number }[] = [];
  const songRows: { session_id: string; track_id: string; position: number }[] = [];
  sessions.forEach((s, i) => {
    const sessionId = sessionIdRows[i]?.id;
    if (!sessionId) return;
    s.content.forEach((c, pos) => contentRows.push({ session_id: sessionId, content_item_id: c.contentItemId, position: pos, display_seconds: c.displaySeconds ?? null }));
    s.ads.forEach((a, pos) => adRows.push({ session_id: sessionId, content_item_id: a.contentItemId, position: pos }));
    s.songs.forEach((sg, pos) => songRows.push({ session_id: sessionId, track_id: sg.trackId, position: pos }));
  });

  const [c1, c2, c3] = await Promise.all([
    contentRows.length ? admin.from("schedule_session_content").insert(contentRows) : Promise.resolve({ error: null }),
    adRows.length ? admin.from("schedule_session_ads").insert(adRows) : Promise.resolve({ error: null }),
    songRows.length ? admin.from("schedule_session_songs").insert(songRows) : Promise.resolve({ error: null }),
  ]);
  if (c1.error || c2.error || c3.error) {
    console.error("replaceScheduleSessions: child insert failed", c1.error, c2.error, c3.error);
    return { ok: false, error: "Sessions saved, but some content/playlist details couldn't be attached." };
  }

  // `replaceSessionsRows` just deleted+reinserted every session (fresh ids,
  // even for ones staff didn't touch), so a live `schedule_playback` row's
  // `session_id`/`content_item_id` can now reference something that no
  // longer exists — without this, the kiosk keeps showing whatever it last
  // resolved until its own content timer happens to fire (or someone
  // presses skip), which can be minutes away. Force a fresh content
  // resolution now so an edit reaches the screen immediately instead —
  // same idempotent CAS advance a skip already uses, just triggered by the
  // save itself. Track/music is deliberately left untouched here — a
  // content-only edit shouldn't also skip whatever's currently playing.
  if (schedule.status === "active") {
    const { data: freshPlayback } = await admin.from("schedule_playback").select("version").eq("schedule_id", schedule.id).maybeSingle();
    if (freshPlayback) {
      await advanceScheduleContent(admin, schedule.id, freshPlayback.version).catch(() => {});
    }
  }

  revalidatePath(schedulesPath(input.branchId));
  return { ok: true, warnings };
}

// ── Activation (Audio-Zone-style, manual) ────────────────────────────────

/** Every room a schedule's targets resolve to — direct rooms, plus every
 * room under a targeted branch or zone. Doesn't attempt to resolve
 * `screenMode: 'specific'` devices down to rooms for conflict purposes (a
 * specific-screens schedule is narrow enough that a room-level conflict
 * check would be overly conservative) — a deliberate, documented
 * simplification, not an oversight. */
async function resolveCoveredRoomIds(
  admin: SupabaseClient,
  targets: { branchIds: string[]; zoneIds: string[]; roomIds: string[] },
): Promise<Set<string>> {
  const ids = new Set<string>(targets.roomIds);
  if (targets.branchIds.length) {
    const { data } = await admin.from("rooms").select("id").in("branch_id", targets.branchIds);
    for (const row of (data ?? []) as { id: string }[]) ids.add(row.id);
  }
  if (targets.zoneIds.length) {
    const { data } = await admin.from("rooms").select("id").in("zone_id", targets.zoneIds);
    for (const row of (data ?? []) as { id: string }[]) ids.add(row.id);
  }
  return ids;
}

async function findConflictingActiveSchedule(
  admin: SupabaseClient,
  schedule: Schedule,
): Promise<{ id: string; name: string } | null> {
  const myRooms = await resolveCoveredRoomIds(admin, schedule);
  if (!myRooms.size) return null;

  const { data: others } = await admin
    .from("schedules")
    .select("id, name")
    .eq("business_id", schedule.businessId)
    .eq("status", "active")
    .neq("id", schedule.id);
  const candidates = (others ?? []) as { id: string; name: string }[];
  if (!candidates.length) return null;

  const targetsById = await getScheduleTargetsByIds(candidates.map((c) => c.id));
  for (const other of candidates) {
    const targets: ScheduleTargets | undefined = targetsById.get(other.id);
    if (!targets) continue;
    const otherRooms = await resolveCoveredRoomIds(admin, targets);
    for (const roomId of otherRooms) {
      if (myRooms.has(roomId)) return other;
    }
  }
  return null;
}

export async function setScheduleStatus(input: {
  branchId: string;
  id: string;
  status: "active" | "paused";
}): Promise<ActionResult> {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, input.branchId)) {
    return { ok: false, error: "You don't have access to this branch." };
  }
  const parsedStatus = statusSchema.safeParse(input.status);
  if (!parsedStatus.success || parsedStatus.data === "draft") {
    return { ok: false, error: "Invalid status." };
  }

  const schedule = await getSchedule(input.branchId, input.id);
  if (!schedule) return { ok: false, error: "Schedule not found." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Not configured." };

  if (input.status === "active") {
    const conflict = await findConflictingActiveSchedule(admin, schedule);
    if (conflict) {
      if (!schedule.overrideExisting) {
        return {
          ok: false,
          error: `"${conflict.name}" is already active on an overlapping room. Turn on "Override conflicting schedules" to replace it.`,
        };
      }
      await admin.from("schedules").update({ status: "paused" }).eq("id", conflict.id);
    }
  }

  const { error } = await admin.from("schedules").update({ status: input.status }).eq("id", schedule.id);
  if (error) {
    console.error("setScheduleStatus: update failed", error);
    return { ok: false, error: "Could not update the schedule's status." };
  }

  if (input.status === "active") {
    // Self-heal / seed: only actually inserted (i.e. genuinely fresh) rows
    // get an initial advance — a resumed schedule's existing track/content
    // is left exactly as it was (see this file's own activation design note).
    const { data: playbackInserted } = await admin
      .from("schedule_playback")
      .upsert({ schedule_id: schedule.id }, { onConflict: "schedule_id", ignoreDuplicates: true })
      .select("schedule_id");
    if (playbackInserted && playbackInserted.length > 0) {
      // track and content share ONE CAS version counter on schedule_playback
      // (see lib/business/schedule-playback.ts's own doc comment) — calling
      // both advances with the same hardcoded version here would mean the
      // second call always finds a stale version (the first one already
      // bumped it) and silently no-ops, every single time. Re-read the real
      // version after the track advance so the content advance's CAS check
      // actually matches. (Confirmed live: this was why an activated
      // schedule's image/video content never appeared — only its music did.)
      await advanceScheduleTrack(admin, schedule.id, 0).catch(() => {});
      const { data: afterTrack } = await admin.from("schedule_playback").select("version").eq("schedule_id", schedule.id).maybeSingle();
      await advanceScheduleContent(admin, schedule.id, afterTrack?.version ?? 0).catch(() => {});
    }
  }

  revalidatePath(schedulesPath(input.branchId));
  return { ok: true };
}

// ── Live playback controls (synchronized, active schedules only) ────────

async function requireActiveSchedule(branchId: string, id: string) {
  const viewer = await getBusinessViewer();
  if (!viewer || !canActOnBranch(viewer, branchId)) {
    return { ok: false as const, error: "You don't have access to this branch." };
  }
  const branch = await getBranch(viewer.businessId, branchId);
  if (!branch) return { ok: false as const, error: "Branch not found." };

  const schedule = await getSchedule(branchId, id);
  if (!schedule) return { ok: false as const, error: "Schedule not found." };
  if (schedule.status !== "active") {
    return { ok: false as const, error: "Activate this schedule to control its playback." };
  }
  if (!schedule.synchronizedPlayback) {
    return { ok: false as const, error: "Turn on Synchronized Playback to control this schedule's music together." };
  }

  const admin = createAdminClient();
  if (!admin) return { ok: false as const, error: "Not configured." };

  return { ok: true as const, branch, schedule, admin };
}

export async function setSchedulePlayback(input: {
  branchId: string;
  id: string;
  isPlaying: boolean;
}): Promise<ActionResult> {
  const ctx = await requireActiveSchedule(input.branchId, input.id);
  if (!ctx.ok) return ctx;
  const { branch, schedule, admin } = ctx;

  const positionMs = computeFrozenPosition(
    // `startedAt`, not `updatedAt` — this row's `updated_at` also moves on a
    // content-only advance (they share one row), which would make this
    // freeze think the track had barely played since a recent content tick
    // and undercount the real elapsed time.
    schedule.playback
      ? { positionMs: schedule.playback.positionMs, isPlaying: schedule.playback.isPlaying, updatedAt: schedule.playback.startedAt ?? schedule.playback.updatedAt }
      : null,
    input.isPlaying,
    Date.now(),
  );

  const { error } = await admin
    .from("schedule_playback")
    .update({ is_playing: input.isPlaying, position_ms: positionMs, updated_at: new Date().toISOString() })
    .eq("schedule_id", schedule.id);
  if (error) {
    console.error("setSchedulePlayback: update failed", error);
    return { ok: false, error: "Could not update playback." };
  }

  revalidatePath(schedulesPath(branch.id));
  return { ok: true };
}

export async function skipScheduleTrack(input: { branchId: string; id: string }): Promise<ActionResult> {
  const ctx = await requireActiveSchedule(input.branchId, input.id);
  if (!ctx.ok) return ctx;
  const { branch, schedule, admin } = ctx;
  if (!schedule.playback) return { ok: false, error: "Schedule playback not initialized." };

  const result = await advanceScheduleTrack(admin, schedule.id, schedule.playback.version);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath(schedulesPath(branch.id));
  return { ok: true };
}

const playTrackSchema = z.object({
  youtubeId: z.string().min(1),
  title: z.string().default(""),
  artist: z.string().nullable().default(null),
  thumbnailUrl: z.string().nullable().default(null),
});

/** Staff picking a specific song to play right now (the Schedule Detail
 * page's "Search & play a song" picker) — jumps live playback straight to
 * it, same CAS guard as every other playback mutator here. The track need
 * not already be part of the session's own configured playlist. */
export async function playScheduleTrack(input: { branchId: string; id: string; track: RoomTrack }): Promise<ActionResult> {
  const ctx = await requireActiveSchedule(input.branchId, input.id);
  if (!ctx.ok) return ctx;
  const { branch, schedule, admin } = ctx;
  if (!schedule.playback) return { ok: false, error: "Schedule playback not initialized." };

  const parsed = playTrackSchema.safeParse(input.track);
  if (!parsed.success) return { ok: false, error: "Invalid track." };

  const result = await advanceScheduleTrackTo(admin, schedule.id, schedule.playback.version, parsed.data);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath(schedulesPath(branch.id));
  return { ok: true };
}

export async function skipScheduleContent(input: { branchId: string; id: string }): Promise<ActionResult> {
  const ctx = await requireActiveSchedule(input.branchId, input.id);
  if (!ctx.ok) return ctx;
  const { branch, schedule, admin } = ctx;
  if (!schedule.playback) return { ok: false, error: "Schedule playback not initialized." };

  const result = await advanceScheduleContent(admin, schedule.id, schedule.playback.version);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath(schedulesPath(branch.id));
  return { ok: true };
}

// ── Playlist builder sources (Step 3's "Playlist" mode) ──────────────────

const pickSchema = z.object({
  youtubeId: z.string().min(5),
  title: z.string().min(1),
  artist: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
});

/**
 * Real tracks for a set of genres, pulled from the shared read-through
 * catalog (`ensureGenreSeeded` — same cache `buildSuggestions`'s genre
 * fallback and the signup taste step already warm) and shuffled — the real
 * version of the old mock's `generateWithAi()`, which shuffled a 36-song
 * local array. Every returned track carries a real `durationSeconds`.
 */
export async function generateScheduleGenreTracks(genres: string[], count = 6): Promise<Track[]> {
  const viewer = await getBusinessViewer();
  if (!viewer) return [];
  const parsedGenres = z.array(z.string()).max(20).safeParse(genres);
  if (!parsedGenres.success || !parsedGenres.data.length) return [];

  const perGenre = Math.max(2, Math.ceil((count * 2) / parsedGenres.data.length));
  const pools = await Promise.all(parsedGenres.data.map((g) => ensureGenreSeeded(g, perGenre)));
  const seen = new Set<string>();
  const pool = pools.flat().filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Catalogs a set of hand-picked YouTube search hits (from `searchBusinessTracks`
 * in app/business/content/actions.ts, reused as-is — no new search endpoint)
 * into the shared `tracks` table and returns them as real `Track`s (real id +
 * real duration), ready to drop straight into a session's song list.
 */
export async function catalogScheduleTracks(picks: YouTubeTrack[]): Promise<Track[]> {
  const viewer = await getBusinessViewer();
  if (!viewer) return [];
  const parsed = z.array(pickSchema).min(1).max(50).safeParse(picks);
  if (!parsed.success) return [];

  const admin = createAdminClient();
  if (!admin) return [];
  return upsertTracksFromYouTube(admin, parsed.data);
}
