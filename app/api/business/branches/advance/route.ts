import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getRoomBySlug } from "@/lib/rooms/queries";
import { buildSuggestions } from "@/lib/rooms/suggestions";
import type { RoomTrack } from "@/lib/rooms/types";

/**
 * Public, unauthenticated — called by a paired branch kiosk when its current
 * track ends. Same trust model as the pairing/heartbeat endpoints: scoped to
 * a slug the kiosk already possesses, not a security boundary.
 *
 * Pulls the next unplayed `room_queue` item for the branch's room; if empty,
 * refills from the branch's genres via the existing suggestion engine, then
 * pops the first result. Always writes the outcome to `room_playback`.
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

  const { data: queueRows } = await admin
    .from("room_queue")
    .select("id, track")
    .eq("room_id", room.id)
    .eq("played", false)
    .order("created_at", { ascending: true })
    .limit(1);

  let next: RoomTrack | null = null;

  if (queueRows?.length) {
    next = queueRows[0].track as RoomTrack;
    await admin
      .from("room_queue")
      .update({ played: true })
      .eq("id", queueRows[0].id);
  } else {
    const [{ data: existingQueue }, { data: playback }] = await Promise.all([
      admin.from("room_queue").select("track").eq("room_id", room.id),
      admin
        .from("room_playback")
        .select("track")
        .eq("room_id", room.id)
        .maybeSingle(),
    ]);
    const exclude = [
      ...(existingQueue ?? [])
        .map((r) => (r.track as RoomTrack | null)?.youtubeId)
        .filter((id): id is string => !!id),
      (playback?.track as RoomTrack | null)?.youtubeId,
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

  await admin
    .from("room_playback")
    .upsert(
      {
        room_id: room.id,
        track: next,
        position_ms: 0,
        is_playing: next !== null,
      },
      { onConflict: "room_id" },
    );

  return NextResponse.json({ track: next });
}
