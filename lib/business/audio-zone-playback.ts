/**
 * Shared CAS-advance logic for a synchronized Audio Zone's playback
 * (`audio_zone_playback`) — the exact same "resolve next track, then
 * compare-and-swap the version" the kiosk-initiated
 * app/api/business/audio-zones/[zoneId]/advance route uses, factored out so
 * a staff-initiated "Skip" action (app/business/audio-zones/actions.ts) can
 * do the identical thing instead of re-deriving it or round-tripping
 * through the route's own HTTP endpoint. SERVER ONLY.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveNextPlaylistTrack } from "@/lib/business/playlist-resolver";
import { buildSuggestions } from "@/lib/rooms/suggestions";
import { nextQueuedZoneTrack } from "@/lib/business/zone-queue";
import type { RoomTrack } from "@/lib/rooms/types";

/** The zone's earliest-covered room's genres — deterministic tie-break so a
 * synchronized zone with no playlist assigned still has a genre fallback
 * instead of leaving every screen silent. */
async function earliestZoneRoomGenres(
  admin: SupabaseClient,
  zoneId: string,
): Promise<{ genres: string[]; error: unknown }> {
  const { data, error } = await admin
    .from("audio_zone_rooms")
    .select("rooms(genres, created_at)")
    .eq("audio_zone_id", zoneId);
  if (error) return { genres: [], error };
  const rows = (data ?? []) as {
    rooms: { genres: string[]; created_at: string } | { genres: string[]; created_at: string }[] | null;
  }[];
  const rooms = rows
    .map((r) => (Array.isArray(r.rooms) ? r.rooms[0] : r.rooms))
    .filter((r): r is { genres: string[]; created_at: string } => !!r)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return { genres: rooms[0]?.genres ?? [], error: null };
}

export type AdvanceZoneResult =
  | { ok: true; track: RoomTrack | null; version: number }
  | { ok: false; error: string };

/**
 * Resolves the next track for `zoneId` and CAS-writes it to
 * `audio_zone_playback`, guarded on `reportedVersion` still matching the
 * row's current version (first-valid-reporter-wins — see the route this
 * mirrors). Callers that already know they hold the current version (this
 * module's own `skipZoneTrack` server action reads it fresh immediately
 * before calling) will win the race barring a genuinely concurrent request.
 */
export async function advanceZonePlayback(
  admin: SupabaseClient,
  zoneId: string,
  reportedVersion: number,
): Promise<AdvanceZoneResult> {
  const { data: current, error: currentError } = await admin
    .from("audio_zone_playback")
    .select("track, version")
    .eq("zone_id", zoneId)
    .maybeSingle();
  if (currentError) return { ok: false, error: "Could not read audio zone playback state." };
  if (!current) return { ok: false, error: "Audio zone playback not initialized." };

  if (current.version !== reportedVersion) {
    // Lost the race (or a stale caller) — hand back the current truth.
    return { ok: true, track: current.track as RoomTrack | null, version: current.version };
  }

  const currentYoutubeId = (current.track as RoomTrack | null)?.youtubeId ?? null;

  // A zone-room joiner's suggestion (audio_zone_queue) plays next, ahead of
  // the zone's own default playlist/genre pick — same "new layer sits above
  // the existing one, existing one keeps working untouched" shape the
  // Schedule-override-above-Audio-Zone design already uses. Only queried
  // when nothing's queued does the zone fall back to its own resolution,
  // exactly as before this change.
  let next: RoomTrack | null = await nextQueuedZoneTrack(admin, zoneId);

  if (!next) {
    const { data: zone, error: zoneError } = await admin
      .from("audio_zones")
      .select("default_playlist_id")
      .eq("id", zoneId)
      .maybeSingle();
    if (zoneError) return { ok: false, error: "Could not read audio zone." };

    next = zone?.default_playlist_id
      ? await resolveNextPlaylistTrack(admin, zone.default_playlist_id, currentYoutubeId)
      : null;
  }

  if (!next) {
    const { genres, error: genresError } = await earliestZoneRoomGenres(admin, zoneId);
    if (genresError) return { ok: false, error: "Could not read zone room genres." };
    if (genres.length) {
      const suggestions = await buildSuggestions({
        roomGenres: genres,
        participantGenres: [],
        exclude: currentYoutubeId ? [currentYoutubeId] : [],
        limit: 1,
      });
      next = suggestions[0] ?? null;
    }
  }

  // No next track resolved at all (no playlist, no genre fallback) — loop
  // the current track rather than go silent; a real next track always wins.
  const resolvedTrack = next ?? (current.track as RoomTrack | null);
  const { data: updated, error: updateError } = await admin
    .from("audio_zone_playback")
    .update({
      track: resolvedTrack,
      is_playing: resolvedTrack !== null,
      position_ms: 0,
      started_at: new Date().toISOString(),
      version: reportedVersion + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("zone_id", zoneId)
    .eq("version", reportedVersion)
    .select("track, version")
    .maybeSingle();

  if (updateError) return { ok: false, error: "Could not advance audio zone playback." };

  if (!updated) {
    // Someone else won between our read and this write — read back the truth.
    const { data: latest, error: latestError } = await admin
      .from("audio_zone_playback")
      .select("track, version")
      .eq("zone_id", zoneId)
      .maybeSingle();
    if (latestError || !latest) return { ok: false, error: "Could not read audio zone playback state." };
    return { ok: true, track: latest.track as RoomTrack | null, version: latest.version };
  }

  return { ok: true, track: updated.track as RoomTrack | null, version: updated.version };
}
