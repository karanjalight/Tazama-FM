/**
 * Shared CAS-advance logic for an active Schedule's own playback authority
 * (`schedule_playback`) — same "resolve next, then compare-and-swap the
 * version" pattern `lib/business/audio-zone-playback.ts` already established
 * for synchronized Audio Zones, reused rather than rebuilt (per the
 * feature's own "reuse the existing synchronization functionality"
 * requirement). Two entry points, not one, because music and visual content
 * end independently and the kiosk drives each with its own client-side
 * timer — same "client drives advance, no cron" pattern as every other
 * playback source in this app. SERVER ONLY.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { getScheduleById } from "@/lib/business/schedule-queries";
import { resolveCurrentSession, currentHHMMInTimezone, secondsUntilSessionEnd } from "@/lib/business/schedule-session-resolver";
import { nextPlaylistPosition } from "@/lib/business/playlist-position";
import type { RoomTrack } from "@/lib/rooms/types";
import type { ScheduleSession, ScheduleContentSnapshot } from "@/lib/business/schedule-types";

export type AdvanceScheduleResult =
  | { ok: true; noActiveSession: true }
  | {
      ok: true;
      noActiveSession: false;
      version: number;
      /** Seconds until the *current* session's own end time — lets the
       * client cap its next-cycle timer so a session boundary is noticed on
       * time instead of only whenever the previously-showing item's own
       * duration happens to expire. Null only if the schedule/session
       * lookup itself failed in a way that shouldn't happen given the
       * guards above (kept optional rather than widening the type for a
       * case that can't occur in practice). */
      sessionEndsInSeconds: number;
      track?: RoomTrack | null;
      contentItemId?: string | null;
      content?: ScheduleContentSnapshot | null;
    }
  | { ok: false; error: string };

async function loadCurrentSession(
  scheduleId: string,
): Promise<
  | { session: ScheduleSession; version: number; sessionEndsInSeconds: number }
  | { session: null; version: number; sessionEndsInSeconds: number }
  | null
> {
  const schedule = await getScheduleById(scheduleId);
  if (!schedule || schedule.status !== "active") return null;
  const nowHHMM = currentHHMMInTimezone(schedule.timezone);
  const session = resolveCurrentSession(schedule.sessions, nowHHMM);
  const version = schedule.playback?.version ?? 0;
  const sessionEndsInSeconds = session ? secondsUntilSessionEnd(session, schedule.timezone) : 0;
  return { session, version, sessionEndsInSeconds } as
    | { session: ScheduleSession; version: number; sessionEndsInSeconds: number }
    | { session: null; version: number; sessionEndsInSeconds: number };
}

/** Advances the schedule's music track. No-op (reports `noActiveSession`)
 * when the schedule isn't active or no session covers this moment — the
 * kiosk's own poll (Part 8) is what decides whether to keep following the
 * schedule at all; this function only ever resolves "what plays within a
 * session that's already known to be current." */
export async function advanceScheduleTrack(
  admin: SupabaseClient,
  scheduleId: string,
  reportedVersion: number,
): Promise<AdvanceScheduleResult> {
  const loaded = await loadCurrentSession(scheduleId);
  if (!loaded) return { ok: false, error: "Schedule not active." };
  const { session, version, sessionEndsInSeconds } = loaded;
  if (!session) return { ok: true, noActiveSession: true };

  if (version !== reportedVersion) {
    const { data: current } = await admin
      .from("schedule_playback")
      .select("track, version")
      .eq("schedule_id", scheduleId)
      .maybeSingle();
    return {
      ok: true,
      noActiveSession: false,
      version: current?.version ?? version,
      sessionEndsInSeconds,
      track: (current?.track as RoomTrack | null) ?? null,
    };
  }

  if (!session.playlistEnabled || !session.songs.length) {
    await admin
      .from("schedule_playback")
      .update({ session_id: session.id, track: null, is_playing: false, position_ms: 0, version: reportedVersion + 1, updated_at: new Date().toISOString() })
      .eq("schedule_id", scheduleId)
      .eq("version", reportedVersion);
    return { ok: true, noActiveSession: false, version: reportedVersion + 1, sessionEndsInSeconds, track: null };
  }

  const { data: current } = await admin.from("schedule_playback").select("track").eq("schedule_id", scheduleId).maybeSingle();
  const currentYoutubeId = (current?.track as RoomTrack | null)?.youtubeId ?? null;
  const ordered = [...session.songs].sort((a, b) => a.position - b.position);
  const currentIndex = currentYoutubeId ? ordered.findIndex((s) => s.track.youtubeId === currentYoutubeId) : -1;
  const nextIndex = nextPlaylistPosition(ordered.length, currentIndex === -1 ? null : currentIndex);
  const next = ordered[nextIndex];
  const track: RoomTrack = { youtubeId: next.track.youtubeId, title: next.track.title, artist: next.track.artist, thumbnailUrl: next.track.thumbnailUrl };

  const { data: updated, error } = await admin
    .from("schedule_playback")
    .update({
      session_id: session.id,
      track,
      is_playing: true,
      position_ms: 0,
      started_at: new Date().toISOString(),
      version: reportedVersion + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("schedule_id", scheduleId)
    .eq("version", reportedVersion)
    .select("track, version")
    .maybeSingle();
  if (error) return { ok: false, error: "Could not advance schedule playback." };
  if (!updated) {
    const { data: latest } = await admin.from("schedule_playback").select("track, version").eq("schedule_id", scheduleId).maybeSingle();
    return {
      ok: true,
      noActiveSession: false,
      version: latest?.version ?? reportedVersion,
      sessionEndsInSeconds,
      track: (latest?.track as RoomTrack | null) ?? null,
    };
  }
  return { ok: true, noActiveSession: false, version: updated.version, sessionEndsInSeconds, track: updated.track as RoomTrack | null };
}

/** Advances the schedule's visual content item. `once` freezes on the last
 * item instead of wrapping (a looping still image/video is what `loop`
 * means to select instead). */
export async function advanceScheduleContent(
  admin: SupabaseClient,
  scheduleId: string,
  reportedVersion: number,
): Promise<AdvanceScheduleResult> {
  const loaded = await loadCurrentSession(scheduleId);
  if (!loaded) return { ok: false, error: "Schedule not active." };
  const { session, version, sessionEndsInSeconds } = loaded;
  if (!session) return { ok: true, noActiveSession: true };

  if (version !== reportedVersion) {
    // A lost race must still hand back the REAL current content, not just
    // its id — this used to select only `content_item_id`, so the caller's
    // `content` came back `undefined` (JSON-serialized as absent, then
    // normalized to `null` client-side) even though the schedule was still
    // genuinely showing something. That blanked the kiosk's visual overlay
    // to nothing every time this call happened to race the track's own
    // advance (which shares this same version column) — a real, frequent
    // cause of content flickering/disappearing early.
    const { data: current } = await admin
      .from("schedule_playback")
      .select("content_item_id, content, version")
      .eq("schedule_id", scheduleId)
      .maybeSingle();
    return {
      ok: true,
      noActiveSession: false,
      version: current?.version ?? version,
      sessionEndsInSeconds,
      contentItemId: current?.content_item_id ?? null,
      content: (current?.content as ScheduleContentSnapshot | null) ?? null,
    };
  }

  if (!session.contentEnabled || !session.content.length) {
    await admin
      .from("schedule_playback")
      .update({ session_id: session.id, content_item_id: null, content: null, content_started_at: null, version: reportedVersion + 1, updated_at: new Date().toISOString() })
      .eq("schedule_id", scheduleId)
      .eq("version", reportedVersion);
    return { ok: true, noActiveSession: false, version: reportedVersion + 1, sessionEndsInSeconds, contentItemId: null, content: null };
  }

  const { data: current } = await admin.from("schedule_playback").select("content_item_id").eq("schedule_id", scheduleId).maybeSingle();
  const currentContentItemId = (current?.content_item_id as string | null) ?? null;
  const ordered = [...session.content].sort((a, b) => a.position - b.position);
  const currentIndex = currentContentItemId ? ordered.findIndex((c) => c.contentItemId === currentContentItemId) : -1;

  let nextIndex: number;
  if (session.contentRepeat === "once" && currentIndex === ordered.length - 1) {
    nextIndex = currentIndex; // freeze on the last item
  } else {
    nextIndex = nextPlaylistPosition(ordered.length, currentIndex === -1 ? null : currentIndex);
  }
  const next = ordered[nextIndex];
  const snapshot: ScheduleContentSnapshot = {
    contentItemId: next.contentItemId,
    title: next.item.title,
    contentType: next.item.contentType,
    url: next.item.url,
    previewUrl: next.item.previewUrl,
    displaySeconds: next.displaySeconds ?? next.item.durationSeconds ?? null,
  };

  const { data: updated, error } = await admin
    .from("schedule_playback")
    .update({
      session_id: session.id,
      content_item_id: next.contentItemId,
      content: snapshot,
      content_started_at: new Date().toISOString(),
      version: reportedVersion + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("schedule_id", scheduleId)
    .eq("version", reportedVersion)
    .select("content_item_id, content, version")
    .maybeSingle();
  if (error) return { ok: false, error: "Could not advance schedule content." };
  if (!updated) {
    const { data: latest } = await admin.from("schedule_playback").select("content_item_id, content, version").eq("schedule_id", scheduleId).maybeSingle();
    return {
      ok: true,
      noActiveSession: false,
      version: latest?.version ?? reportedVersion,
      sessionEndsInSeconds,
      contentItemId: latest?.content_item_id ?? null,
      content: (latest?.content as ScheduleContentSnapshot | null) ?? null,
    };
  }
  return {
    ok: true,
    noActiveSession: false,
    version: updated.version,
    sessionEndsInSeconds,
    contentItemId: updated.content_item_id,
    content: updated.content as ScheduleContentSnapshot | null,
  };
}
