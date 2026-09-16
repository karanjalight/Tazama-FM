import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveNextPlaylistTrack } from "@/lib/business/playlist-resolver";
import { schedulePlaylistPlayRecord } from "@/lib/business/playlist-mix-pool";
import { getRoomBySlug } from "@/lib/rooms/queries";
import { buildSuggestions } from "@/lib/rooms/suggestions";
import { claimNextRequest } from "@/lib/pair/request-queue";
import { readPlaylistCursor, writePlaylistCursor } from "@/lib/pair/playlist-cursor-store";
import { cursorAfterAdvance, cursorBasis } from "@/lib/pair/playlist-cursor";
import type { RoomTrack } from "@/lib/rooms/types";

/**
 * Public, unauthenticated — called by a paired branch kiosk when its current
 * track ends. Same trust model as the pairing/heartbeat endpoints: scoped to
 * a slug the kiosk already possesses, not a security boundary.
 *
 * A guest's Pair request (`venue_requests`) plays first; then the next
 * unplayed `room_queue` item for the branch's room; if both are empty, the
 * room's audio zone playlist, else a refill from the branch's genres via the
 * existing suggestion engine. Always writes the outcome to `room_playback`.
 */
export async function POST(request: Request) {
  let slug: unknown;
  try {
    ({ slug } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof slug !== "string" || !slug) {
    return NextResponse.json({ error: "Missing slug." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const room = await getRoomBySlug(slug);
  if (!room?.ownerBusinessId) {
    return NextResponse.json({ error: "Not a branch." }, { status: 404 });
  }

  const { count: deviceCount } = await admin
    .from("branch_devices")
    .select("id", { count: "exact", head: true })
    .eq("room_id", room.id);
  if (!deviceCount) {
    return NextResponse.json({ error: "Device not paired." }, { status: 404 });
  }

  const [{ data: playback }, cursor] = await Promise.all([
    admin.from("room_playback").select("track").eq("room_id", room.id).maybeSingle(),
    readPlaylistCursor(admin, "room", room.id),
  ]);
  const currentYoutubeId = (playback?.track as RoomTrack | null)?.youtubeId ?? null;
  // Where the playlist resumes — the cursor survives one-off picks (guest
  // requests, queued songs) playing in between (see lib/pair/playlist-cursor.ts).
  const basisYoutubeId = cursorBasis(cursor, currentYoutubeId);

  let next: RoomTrack | null = null;
  // Set only when `next` came from an audio zone's playlist.
  let playlistIdUsed: string | null = null;
  // True when `next` is a one-off pick layered over the playlist.
  let interruptsPlaylist = false;

  const pairRequest = await claimNextRequest(admin, [room.id]);
  if (pairRequest) {
    next = pairRequest.track;
    interruptsPlaylist = true;
  } else {
    const { data: queueRows } = await admin
      .from("room_queue")
      .select("id, track")
      .eq("room_id", room.id)
      .eq("played", false)
      .order("created_at", { ascending: true })
      .limit(1);

    if (queueRows?.length) {
      next = queueRows[0].track as RoomTrack;
      interruptsPlaylist = true;
      await admin
        .from("room_queue")
        .update({ played: true })
        .eq("id", queueRows[0].id);
    } else {
      const { data: existingQueue } = await admin
        .from("room_queue")
        .select("track")
        .eq("room_id", room.id)
        .order("created_at", { ascending: false })
        .limit(30);

      const { data: zoneLinks } = await admin
        .from("audio_zone_rooms")
        .select("audio_zones(default_playlist_id)")
        .eq("room_id", room.id);
      const playlistId =
        ((zoneLinks ?? []) as {
          audio_zones: { default_playlist_id: string | null } | { default_playlist_id: string | null }[] | null;
        }[])
          .map((r) => (Array.isArray(r.audio_zones) ? r.audio_zones[0] : r.audio_zones))
          .find((z) => z?.default_playlist_id)?.default_playlist_id ?? null;

      if (playlistId) {
        next = await resolveNextPlaylistTrack(admin, playlistId, basisYoutubeId);
        if (next) playlistIdUsed = playlistId;
      }

      if (!next) {
        const exclude = [
          ...(existingQueue ?? [])
            .map((r) => (r.track as RoomTrack | null)?.youtubeId)
            .filter((id): id is string => !!id),
          currentYoutubeId,
        ].filter((id): id is string => !!id);

        const suggestions = await buildSuggestions({
          roomGenres: room.genres,
          participantGenres: [],
          exclude,
          limit: 20,
        });

        if (suggestions.length > 0) {
          const { error: insertError } = await admin.from("room_queue").insert(
            suggestions.map((track, i) => ({
              room_id: room.id,
              track,
              added_by: null,
              played: i === 0,
            })),
          );
          if (!insertError) next = suggestions[0];
        }
      }

      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await admin
        .from("room_queue")
        .delete()
        .eq("room_id", room.id)
        .eq("played", true)
        .lt("created_at", cutoff);
    }
  }

  const { error: playbackError } = await admin
    .from("room_playback")
    .upsert(
      {
        room_id: room.id,
        track: next,
        position_ms: 0,
        is_playing: next !== null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "room_id" },
    );

  if (!playbackError) {
    if (playlistIdUsed && next) schedulePlaylistPlayRecord(admin, playlistIdUsed, next.youtubeId);
    const nextCursor = cursorAfterAdvance({ interruptsPlaylist, basisYoutubeId });
    if (nextCursor !== cursor) await writePlaylistCursor(admin, "room", room.id, nextCursor);
  }

  return NextResponse.json({ track: next });
}
