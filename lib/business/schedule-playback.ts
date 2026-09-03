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
import {
  resolveCurrentSession,
  currentHHMMInTimezone,
  secondsUntilSessionEnd,
  sessionStartInstantMs,
} from "@/lib/business/schedule-session-resolver";
import { nextPlaylistPosition } from "@/lib/business/playlist-position";
import type { RoomTrack } from "@/lib/rooms/types";
import type { ScheduleSession, ScheduleSessionContentItem, ScheduleContentSnapshot, ContentRepeat } from "@/lib/business/schedule-types";

/** Fallback for a content item with neither an explicit display duration nor
 * its own natural length — mirrors the kiosk's own `FALLBACK_CONTENT_SECONDS`
 * (shouldn't happen; the wizard requires a duration for anything without a
 * natural one) so periodic mode's cumulative-duration math never divides by
 * zero or stalls on an item that "lasts" 0 seconds. */
const DEFAULT_ITEM_SECONDS = 30;

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
      /** Only ever meaningful for a content-advance result on a `periodic`
       * session — how long until the NEXT thing worth checking for (a
       * cycle's interruption starting, an item inside one ending, or the
       * session boundary if the interruption is now permanently done under
       * `contentRepeat: "once"`). `content?.displaySeconds` already carries
       * the equivalent for a `continuous` session, so this stays absent
       * there rather than duplicating it. */
      contentRecheckInSeconds?: number | null;
      track?: RoomTrack | null;
      contentItemId?: string | null;
      content?: ScheduleContentSnapshot | null;
    }
  | { ok: false; error: string };

async function loadCurrentSession(scheduleId: string): Promise<
  | { session: ScheduleSession; version: number; sessionEndsInSeconds: number; timezone: string }
  | { session: null; version: number; sessionEndsInSeconds: number; timezone: string }
  | null
> {
  const schedule = await getScheduleById(scheduleId);
  if (!schedule || schedule.status !== "active") return null;
  const nowHHMM = currentHHMMInTimezone(schedule.timezone);
  const session = resolveCurrentSession(schedule.sessions, nowHHMM);
  const version = schedule.playback?.version ?? 0;
  const sessionEndsInSeconds = session ? secondsUntilSessionEnd(session, schedule.timezone) : 0;
  return { session, version, sessionEndsInSeconds, timezone: schedule.timezone } as
    | { session: ScheduleSession; version: number; sessionEndsInSeconds: number; timezone: string }
    | { session: null; version: number; sessionEndsInSeconds: number; timezone: string };
}

/**
 * Which content item (if any) should be showing right now on a `periodic`
 * session, purely as a function of elapsed time since the session started —
 * unlike `continuous` mode's "advance one step from wherever we were", this
 * needs no memory of prior state at all, so it's naturally self-healing
 * (every call recomputes fresh from `elapsedMs`, the same way
 * `resolveCurrentSession` itself recomputes fresh from wall-clock time).
 *
 * Model: content plays immediately (the full ordered list through once,
 * however long that takes), then hands back to music for a full
 * `intervalMinutes` before the next occurrence — `intervalMinutes` is
 * always the MUSIC gap's own length, not a fixed clock tick from session
 * start, so a longer content list never eats into the gap that follows it.
 * `contentRepeat: "loop"` repeats that (content, interval-music) cycle for
 * as long as the session runs; `"once"` means that very first playthrough
 * is the only one that ever happens — music plays for good once it ends.
 */
export function resolvePeriodicContent(
  ordered: ScheduleSessionContentItem[],
  contentRepeat: ContentRepeat,
  intervalMinutes: number,
  elapsedMs: number,
): { item: ScheduleSessionContentItem | null; recheckInSeconds: number | null } {
  const itemDurationsMs = ordered.map((c) => (c.displaySeconds ?? c.item.durationSeconds ?? DEFAULT_ITEM_SECONDS) * 1000);
  const totalMs = itemDurationsMs.reduce((a, b) => a + b, 0);
  const intervalMs = Math.max(1, intervalMinutes) * 60_000;
  const clampedElapsedMs = Math.max(0, elapsedMs);

  if (totalMs <= 0) return { item: null, recheckInSeconds: Math.ceil(intervalMs / 1000) };

  let withinPlaythroughMs: number;
  if (contentRepeat === "once") {
    if (clampedElapsedMs >= totalMs) {
      // Already played its one-and-only occurrence — music forever after;
      // let the caller fall back to its own session-boundary-only default
      // instead of a bogus short recheck.
      return { item: null, recheckInSeconds: null };
    }
    withinPlaythroughMs = clampedElapsedMs;
  } else {
    const cycleMs = totalMs + intervalMs;
    const cyclePos = clampedElapsedMs % cycleMs;
    if (cyclePos >= totalMs) {
      return { item: null, recheckInSeconds: Math.max(1, Math.ceil((cycleMs - cyclePos) / 1000)) };
    }
    withinPlaythroughMs = cyclePos;
  }

  let acc = 0;
  for (let i = 0; i < ordered.length; i++) {
    const dur = itemDurationsMs[i];
    if (withinPlaythroughMs < acc + dur) {
      return { item: ordered[i], recheckInSeconds: Math.max(1, Math.ceil((acc + dur - withinPlaythroughMs) / 1000)) };
    }
    acc += dur;
  }
  // Rounding landed exactly on the tail boundary — nothing left to show
  // this occurrence right now; recheck almost immediately rather than
  // guessing at the next boundary (the `once` case is already handled
  // above; `loop` will resolve correctly into the music gap on the very
  // next call, a negligible one-tick delay).
  return { item: null, recheckInSeconds: 1 };
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
  const { session, version, sessionEndsInSeconds, timezone } = loaded;
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

  const ordered = [...session.content].sort((a, b) => a.position - b.position);

  if (session.contentFrequencyMode === "periodic") {
    // Music plays as the base state; content only interrupts every
    // `contentFrequencyIntervalMinutes` — a fundamentally different model
    // from continuous mode's "always cycling", so it gets its own
    // stateless, time-driven resolution instead (see the helper's doc
    // comment) rather than reusing the advance-by-one machinery below.
    const elapsedMs = Date.now() - sessionStartInstantMs(session, timezone);
    const { item, recheckInSeconds } = resolvePeriodicContent(
      ordered,
      session.contentRepeat,
      session.contentFrequencyIntervalMinutes ?? 30,
      elapsedMs,
    );

    if (!item) {
      await admin
        .from("schedule_playback")
        .update({ session_id: session.id, content_item_id: null, content: null, content_started_at: null, version: reportedVersion + 1, updated_at: new Date().toISOString() })
        .eq("schedule_id", scheduleId)
        .eq("version", reportedVersion);
      return {
        ok: true,
        noActiveSession: false,
        version: reportedVersion + 1,
        sessionEndsInSeconds,
        contentRecheckInSeconds: recheckInSeconds,
        contentItemId: null,
        content: null,
      };
    }

    // The snapshot's `displaySeconds` carries how long is left on THIS item
    // right now (not its full configured duration) — a realtime subscriber
    // that only ever reads the persisted row (never calls this function
    // itself) needs that countdown to arm its own timer correctly too.
    const periodicSnapshot: ScheduleContentSnapshot = {
      contentItemId: item.contentItemId,
      title: item.item.title,
      contentType: item.item.contentType,
      url: item.item.url,
      previewUrl: item.item.previewUrl,
      displaySeconds: recheckInSeconds,
    };

    const { data: updated, error } = await admin
      .from("schedule_playback")
      .update({
        session_id: session.id,
        content_item_id: item.contentItemId,
        content: periodicSnapshot,
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

  const { data: current } = await admin.from("schedule_playback").select("content_item_id").eq("schedule_id", scheduleId).maybeSingle();
  const currentContentItemId = (current?.content_item_id as string | null) ?? null;
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
