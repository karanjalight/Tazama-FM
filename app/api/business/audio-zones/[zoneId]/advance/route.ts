import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveNextPlaylistTrack } from "@/lib/business/playlist-resolver";
import { buildSuggestions } from "@/lib/rooms/suggestions";
import type { RoomTrack } from "@/lib/rooms/types";

/** The zone's earliest-covered room's genres — deterministic tie-break
 * (audio_zone_rooms joined to rooms.created_at, ascending) so a
 * synchronized zone with no playlist assigned still has a genre fallback
 * instead of leaving every screen silent. Surfaces `error` so the caller can
 * tell a genuine query failure apart from "this zone covers no rooms" —
 * both would otherwise look like an empty `genres` array. */
async function earliestZoneRoomGenres(
  admin: SupabaseClient,
  zoneId: string,
): Promise<{ genres: string[]; error: unknown }> {
  const { data, error } = await admin
    .from("audio_zone_rooms")
    .select("rooms(genres, created_at)")
    .eq("audio_zone_id", zoneId);
  if (error) {
    return { genres: [], error };
  }
  const rows = (data ?? []) as {
    rooms: { genres: string[]; created_at: string } | { genres: string[]; created_at: string }[] | null;
  }[];
  const rooms = rows
    .map((r) => (Array.isArray(r.rooms) ? r.rooms[0] : r.rooms))
    .filter((r): r is { genres: string[]; created_at: string } => !!r)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return { genres: rooms[0]?.genres ?? [], error: null };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ zoneId: string }> },
) {
  const { zoneId } = await params;
  let reportedVersion: unknown;
  try {
    ({ reportedVersion } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof reportedVersion !== "number") {
    return NextResponse.json({ error: "Missing reportedVersion." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const { data: current, error: currentError } = await admin
    .from("audio_zone_playback")
    .select("track, version")
    .eq("zone_id", zoneId)
    .maybeSingle();
  if (currentError) {
    return NextResponse.json({ error: "Could not read audio zone playback state." }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json({ error: "Audio zone not found." }, { status: 404 });
  }

  if (current.version !== reportedVersion) {
    // Lost the race (or reporting a stale version) — hand back the current
    // truth; this kiosk's own realtime subscription will also see it soon.
    return NextResponse.json({ track: current.track, version: current.version });
  }

  const { data: zone, error: zoneError } = await admin
    .from("audio_zones")
    .select("default_playlist_id")
    .eq("id", zoneId)
    .maybeSingle();
  if (zoneError) {
    return NextResponse.json({ error: "Could not read audio zone." }, { status: 500 });
  }

  const currentYoutubeId = (current.track as RoomTrack | null)?.youtubeId ?? null;
  let next: RoomTrack | null = zone?.default_playlist_id
    ? await resolveNextPlaylistTrack(admin, zone.default_playlist_id, currentYoutubeId)
    : null;

  if (!next) {
    const { genres, error: genresError } = await earliestZoneRoomGenres(admin, zoneId);
    if (genresError) {
      return NextResponse.json({ error: "Could not read zone room genres." }, { status: 500 });
    }
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

  // With no next track resolved (no playlist assigned and no genre
  // fallback), loop the zone's current track instead of going silent — a
  // synchronized zone otherwise has no way to recover playback. A real next
  // track always wins; only a zone that has never played anything (nothing
  // to loop) legitimately stays null.
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

  if (updateError) {
    return NextResponse.json({ error: "Could not advance audio zone playback." }, { status: 500 });
  }

  if (!updated) {
    // Someone else won between our read and this write — read back the truth.
    const { data: latest, error: latestError } = await admin
      .from("audio_zone_playback")
      .select("track, version")
      .eq("zone_id", zoneId)
      .maybeSingle();
    if (latestError || !latest) {
      return NextResponse.json({ error: "Could not read audio zone playback state." }, { status: 500 });
    }
    return NextResponse.json({ track: latest.track, version: latest.version });
  }

  return NextResponse.json({ track: updated.track, version: updated.version });
}
