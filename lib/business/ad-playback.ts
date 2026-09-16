/**
 * Server-side takeover/release of whichever playback source (Schedule >
 * synchronized Audio Zone > Room — the same priority `KioskRoomPlayer`
 * applies client-side) a room currently follows. SERVER ONLY.
 *
 * The claim stamps `active_ad` on that source's row. Every kiosk subscribed to
 * the row learns about the ad at the same instant, and `active_ad is null` in
 * the WHERE clause makes it the "one airing at a time" lock. Only a full
 * video/audio break (`pausesMusic`) also freezes the music, the same way
 * `computeFrozenPosition` already freezes a paused room, so release resumes
 * at the exact spot.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSynchronizedZoneForRoom } from "@/lib/business/audio-zone-queries";
import { getScheduleTargetsByIds, listActiveSchedulesCoveringRoom } from "@/lib/business/schedule-queries";
import { currentHHMMInTimezone, resolveCurrentSession } from "@/lib/business/schedule-session-resolver";
import { computeFrozenPosition } from "@/lib/business/playback-freeze";
import type { ActiveAdSnapshot, AdSourceKind } from "@/lib/business/ad-types";

export interface PlaybackSource {
  kind: AdSourceKind;
  id: string; // scheduleId | audio zone id | roomId
}

const TABLE_BY_KIND: Record<AdSourceKind, string> = {
  schedule: "schedule_playback",
  zone: "audio_zone_playback",
  room: "room_playback",
};
const ID_COLUMN_BY_KIND: Record<AdSourceKind, string> = {
  schedule: "schedule_id",
  zone: "zone_id",
  room: "room_id",
};

export async function resolveAuthoritativePlaybackSource(roomId: string): Promise<PlaybackSource> {
  const schedules = await listActiveSchedulesCoveringRoom(roomId);
  for (const schedule of schedules) {
    if (resolveCurrentSession(schedule.sessions, currentHHMMInTimezone(schedule.timezone))) {
      return { kind: "schedule", id: schedule.id };
    }
  }
  const zone = await getSynchronizedZoneForRoom(roomId);
  if (zone) return { kind: "zone", id: zone.id };
  return { kind: "room", id: roomId };
}

/** Every room whose kiosks follow `source` — the audience an airing on it can
 * reach. Always includes `roomId` (the room that asked). */
export async function listRoomsFollowingSource(
  admin: SupabaseClient,
  source: PlaybackSource,
  roomId: string,
): Promise<string[]> {
  const ids = new Set<string>([roomId]);
  if (source.kind === "zone") {
    const { data } = await admin.from("audio_zone_rooms").select("room_id").eq("audio_zone_id", source.id);
    for (const r of (data ?? []) as { room_id: string }[]) ids.add(r.room_id);
  } else if (source.kind === "schedule") {
    const targets = (await getScheduleTargetsByIds([source.id])).get(source.id);
    if (targets) {
      for (const id of targets.roomIds) ids.add(id);
      const lookups = [
        targets.branchIds.length
          ? admin.from("rooms").select("id").in("branch_id", targets.branchIds)
          : Promise.resolve({ data: [] as { id: string }[] }),
        targets.zoneIds.length
          ? admin.from("rooms").select("id").in("zone_id", targets.zoneIds)
          : Promise.resolve({ data: [] as { id: string }[] }),
      ] as const;
      const [byBranch, byZone] = await Promise.all(lookups);
      for (const r of (byBranch.data ?? []) as { id: string }[]) ids.add(r.id);
      for (const r of (byZone.data ?? []) as { id: string }[]) ids.add(r.id);
      if (targets.deviceIds.length) {
        const { data } = await admin.from("branch_devices").select("room_id").in("id", targets.deviceIds);
        for (const r of (data ?? []) as { room_id: string | null }[]) if (r.room_id) ids.add(r.room_id);
      }
    }
  }
  return [...ids];
}

export async function readActiveAd(admin: SupabaseClient, source: PlaybackSource): Promise<ActiveAdSnapshot | null> {
  const { data, error } = await admin
    .from(TABLE_BY_KIND[source.kind])
    .select("active_ad")
    .eq(ID_COLUMN_BY_KIND[source.kind], source.id)
    .maybeSingle();
  if (error) return null;
  return ((data as { active_ad: ActiveAdSnapshot | null } | null)?.active_ad ?? null) as ActiveAdSnapshot | null;
}

export type ClaimOutcome =
  | { status: "won"; resumePlaying: boolean }
  | { status: "already-claimed"; ad: ActiveAdSnapshot }
  /** A legitimate track/content advance won the version race — try again. */
  | { status: "retry" }
  /** The source has no playback row yet (nothing has ever played there). */
  | { status: "no-source" };

interface SourceRow {
  position_ms: number;
  is_playing: boolean;
  updated_at: string;
  started_at?: string | null;
  active_ad: ActiveAdSnapshot | null;
  version?: number;
}

export async function claimBreakOnSource(
  admin: SupabaseClient,
  source: PlaybackSource,
  snapshot: ActiveAdSnapshot,
): Promise<ClaimOutcome> {
  const table = TABLE_BY_KIND[source.kind];
  const idColumn = ID_COLUMN_BY_KIND[source.kind];
  const columns =
    source.kind === "schedule"
      ? "position_ms, is_playing, updated_at, started_at, active_ad, version"
      : source.kind === "zone"
        ? "position_ms, is_playing, updated_at, active_ad, version"
        : "position_ms, is_playing, updated_at, active_ad";

  const { data: current, error: readError } = await admin.from(table).select(columns).eq(idColumn, source.id).maybeSingle();
  if (readError || !current) return { status: "no-source" };
  const row = current as unknown as SourceRow;
  if (row.active_ad) return { status: "already-claimed", ad: row.active_ad };

  const patch: Record<string, unknown> = { active_ad: snapshot };
  if (snapshot.pausesMusic) {
    // Schedule rows also bump `updated_at` on content-only advances, so
    // `started_at` is their trustworthy position reference (same reasoning as
    // useSchedulePlayback). Zone and room positions are relative to `updated_at`.
    const reference = source.kind === "schedule" ? (row.started_at ?? row.updated_at) : row.updated_at;
    patch.position_ms = computeFrozenPosition(
      { positionMs: row.position_ms, isPlaying: row.is_playing, updatedAt: reference },
      false,
      Date.now(),
    );
    patch.is_playing = false;
    patch.updated_at = new Date().toISOString();
    if (source.kind !== "room") patch.version = (row.version ?? 0) + 1;
  }

  let query = admin.from(table).update(patch).eq(idColumn, source.id).is("active_ad", null);
  if (snapshot.pausesMusic && source.kind !== "room") query = query.eq("version", row.version ?? 0);
  const { data: updated, error } = await query.select(idColumn).maybeSingle();

  if (error || !updated) {
    const fresh = await readActiveAd(admin, source);
    if (fresh) return { status: "already-claimed", ad: fresh };
    return { status: "retry" };
  }
  return { status: "won", resumePlaying: row.is_playing };
}

/**
 * Clears `active_ad` — guarded on the airing's own id, so a late or duplicate
 * release can't clobber a NEWER airing on the same source. A music-pausing
 * break also resumes (only if it was playing when frozen), leaving
 * `position_ms` untouched so music continues exactly where it stopped.
 */
export async function releaseBreakOnSource(
  admin: SupabaseClient,
  source: PlaybackSource,
  breakId: string,
  options: { pausesMusic: boolean; resumePlaying: boolean },
): Promise<boolean> {
  const table = TABLE_BY_KIND[source.kind];
  const idColumn = ID_COLUMN_BY_KIND[source.kind];
  const patch: Record<string, unknown> = { active_ad: null };

  if (options.pausesMusic) {
    const now = new Date().toISOString();
    patch.is_playing = options.resumePlaying;
    patch.updated_at = now;
    if (source.kind === "schedule") patch.started_at = now;
    if (source.kind !== "room") {
      const { data } = await admin.from(table).select("version").eq(idColumn, source.id).maybeSingle();
      patch.version = (((data as { version?: number } | null)?.version ?? 0) as number) + 1;
    }
  }

  const { data, error } = await admin
    .from(table)
    .update(patch)
    .eq(idColumn, source.id)
    .eq("active_ad->>breakId", breakId)
    .select(idColumn)
    .maybeSingle();
  return !error && !!data;
}
