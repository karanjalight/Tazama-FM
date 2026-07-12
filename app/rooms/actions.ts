"use server";

/**
 * Room mutations. Every action re-checks the viewer (Server Functions are
 * reachable by direct POST), then writes via the service-role client with
 * ownership enforced here in app code.
 */
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { getRoomViewer } from "@/lib/rooms/viewer";
import { getOrCreateGuestViewer } from "@/lib/rooms/guest-session";
import { getRoomBySlug, getRoomQueue } from "@/lib/rooms/queries";
import { slugify, randomSuffix } from "@/lib/rooms/slug";
import { ROOM_GENRES, MAX_ROOM_GENRES } from "@/lib/room-genres";
import type { RoomTrack, QueueItem } from "@/lib/rooms/types";

const VALID_GENRES = new Set(ROOM_GENRES.map((g) => g.value));

/**
 * Resolve the acting identity for a room action: a real/demo viewer normally,
 * or — ONLY when this action independently confirms (via its own DB lookup,
 * never trusting client input) that the target room belongs to a business
 * branch — the anonymous guest identity from the `tz_room_guest` cookie
 * (`getOrCreateGuestViewer`, resolved server-side, never client-supplied).
 * Consumer rooms are unaffected: with no real viewer and no confirmed branch,
 * this returns null.
 */
async function resolveActor(
  roomId: string,
): Promise<{ id: string; name: string } | null> {
  const viewer = await getRoomViewer();
  if (viewer) return { id: viewer.id, name: viewer.name };
  const admin = createAdminClient();
  if (!admin) return null;
  const { data: room } = await admin
    .from("rooms")
    .select("owner_business_id")
    .eq("id", roomId)
    .maybeSingle();
  if (!room?.owner_business_id) return null;
  const guest = await getOrCreateGuestViewer();
  return { id: guest.id, name: guest.name };
}

const createSchema = z.object({
  name: z.string().trim().min(2, "Give your hangout a name.").max(60),
  about: z.string().trim().max(280).default(""),
  access: z.enum(["public", "private"]),
  genres: z
    .array(z.string())
    .max(MAX_ROOM_GENRES)
    .refine((gs) => gs.every((g) => VALID_GENRES.has(g)), "Unknown genre."),
});

export type CreateRoomInput = z.infer<typeof createSchema>;
export type CreateRoomResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

const trackSchema = z.object({
  youtubeId: z.string().min(1),
  title: z.string().default(""),
  artist: z.string().nullable().default(null),
  thumbnailUrl: z.string().nullable().default(null),
});

async function uniqueSlug(base: string): Promise<string> {
  const admin = createAdminClient();
  let slug = slugify(base) || "hangout";
  for (let i = 0; i < 5; i++) {
    if (!admin) return `${slug}-${randomSuffix()}`;
    const { data } = await admin
      .from("rooms")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    slug = `${slugify(base) || "hangout"}-${randomSuffix()}`;
  }
  return `${slugify(base) || "hangout"}-${randomSuffix(6)}`;
}

export async function createRoom(
  input: CreateRoomInput,
): Promise<CreateRoomResult> {
  const viewer = await getRoomViewer();
  if (!viewer) return { ok: false, error: "Please sign in to host a room." };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false,
      error: "Rooms aren't configured yet (missing service-role key).",
    };
  }

  const slug = await uniqueSlug(parsed.data.name);

  const { data: room, error } = await admin
    .from("rooms")
    .insert({
      slug,
      host_id: viewer.id,
      name: parsed.data.name,
      about: parsed.data.about,
      access: parsed.data.access,
      genres: parsed.data.genres,
      is_live: true,
    })
    .select("id, slug")
    .single();

  if (error || !room) {
    // Surface the real cause server-side (e.g. schema drift) — the client only
    // ever sees a friendly message.
    console.error("[createRoom] insert failed:", error?.message ?? "no row");
    return { ok: false, error: "Could not create the room. Try again." };
  }

  await Promise.all([
    admin
      .from("room_members")
      .upsert(
        { room_id: room.id, user_id: viewer.id, role: "host" },
        { onConflict: "room_id,user_id" },
      ),
    admin
      .from("room_playback")
      .upsert({ room_id: room.id }, { onConflict: "room_id" }),
  ]);

  return { ok: true, slug: room.slug };
}

export async function setRoomLive(
  roomId: string,
  isLive: boolean,
): Promise<{ ok: boolean }> {
  const viewer = await getRoomViewer();
  const admin = createAdminClient();
  if (!viewer || !admin) return { ok: false };
  const { error } = await admin
    .from("rooms")
    .update({ is_live: isLive })
    .eq("id", roomId)
    .eq("host_id", viewer.id);
  return { ok: !error };
}

export async function deleteRoom(roomId: string): Promise<{ ok: boolean }> {
  const viewer = await getRoomViewer();
  const admin = createAdminClient();
  if (!viewer || !admin) return { ok: false };
  const { error } = await admin
    .from("rooms")
    .delete()
    .eq("id", roomId)
    .eq("host_id", viewer.id);
  return { ok: !error };
}

/** Record membership (for private access + listener tally). Idempotent. */
export async function joinRoom(roomId: string): Promise<{ ok: boolean }> {
  const viewer = await getRoomViewer();
  const admin = createAdminClient();
  if (!viewer || !admin) return { ok: false };
  const { error } = await admin
    .from("room_members")
    .upsert(
      { room_id: roomId, user_id: viewer.id, role: "listener" },
      { onConflict: "room_id,user_id", ignoreDuplicates: true },
    );
  return { ok: !error };
}

/** Caps how many unplayed items one room's queue can hold — a guest song
 * request needs no account, so this is the backstop against a script (or an
 * over-enthusiastic shopper) flooding a branch's queue with unlimited adds. */
const MAX_QUEUE_LENGTH = 100;

export async function addToQueue(
  roomId: string,
  track: RoomTrack,
): Promise<{ ok: boolean }> {
  const actor = await resolveActor(roomId);
  const admin = createAdminClient();
  if (!actor || !admin) return { ok: false };
  const parsed = trackSchema.safeParse(track);
  if (!parsed.success) return { ok: false };

  const { count } = await admin
    .from("room_queue")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("played", false);
  if ((count ?? 0) >= MAX_QUEUE_LENGTH) return { ok: false };

  const { error } = await admin.from("room_queue").insert({
    room_id: roomId,
    track: parsed.data,
    added_by: actor.id,
    added_by_name: actor.name,
  });
  return { ok: !error };
}

export async function removeFromQueue(
  queueId: string,
): Promise<{ ok: boolean }> {
  const admin = createAdminClient();
  if (!admin) return { ok: false };
  const { data: row } = await admin
    .from("room_queue")
    .select("id, added_by, room_id, rooms(host_id)")
    .eq("id", queueId)
    .maybeSingle();
  if (!row) return { ok: false };
  const actor = await resolveActor(row.room_id);
  if (!actor) return { ok: false };
  // Host or the person who added it may remove (enforced via OR below).
  const hostId = (row as { rooms?: { host_id?: string } }).rooms?.host_id;
  const canRemove = row.added_by === actor.id || hostId === actor.id;
  if (!canRemove) return { ok: false };
  const { error } = await admin.from("room_queue").delete().eq("id", queueId);
  return { ok: !error };
}

export async function toggleLike(
  roomId: string,
  queueId: string,
): Promise<{ ok: boolean; liked: boolean }> {
  const actor = await resolveActor(roomId);
  const admin = createAdminClient();
  if (!actor || !admin) return { ok: false, liked: false };

  const { data: existing } = await admin
    .from("room_track_likes")
    .select("queue_id")
    .eq("queue_id", queueId)
    .eq("user_id", actor.id)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("room_track_likes")
      .delete()
      .eq("queue_id", queueId)
      .eq("user_id", actor.id);
    return { ok: !error, liked: false };
  }

  const { error } = await admin.from("room_track_likes").insert({
    queue_id: queueId,
    user_id: actor.id,
    room_id: roomId,
  });
  return { ok: !error, liked: true };
}

/** Host marks the current track finished so it leaves the up-next list. */
export async function markPlayed(
  roomId: string,
  queueId: string,
): Promise<{ ok: boolean }> {
  const viewer = await getRoomViewer();
  const admin = createAdminClient();
  if (!viewer || !admin) return { ok: false };
  const { error } = await admin
    .from("room_queue")
    .update({ played: true })
    .eq("id", queueId)
    .eq("room_id", roomId);
  return { ok: !error };
}

/** Host persists the playback snapshot (for late-joiners + free-tier cap). */
export async function savePlayback(
  roomId: string,
  snapshot: {
    track: RoomTrack | null;
    positionMs: number;
    isPlaying: boolean;
    listeningMsDelta?: number;
  },
): Promise<{ ok: boolean }> {
  const viewer = await getRoomViewer();
  const admin = createAdminClient();
  if (!viewer || !admin) return { ok: false };

  // Only the host may persist; bump the cumulative listening total.
  const { data: room } = await admin
    .from("rooms")
    .select("host_id")
    .eq("id", roomId)
    .maybeSingle();
  if (!room || room.host_id !== viewer.id) return { ok: false };

  const { data: prev } = await admin
    .from("room_playback")
    .select("listening_ms_total")
    .eq("room_id", roomId)
    .maybeSingle();
  const total =
    Number(prev?.listening_ms_total ?? 0) +
    Math.max(0, snapshot.listeningMsDelta ?? 0);

  const { error } = await admin.from("room_playback").upsert(
    {
      room_id: roomId,
      track: snapshot.track,
      position_ms: Math.max(0, Math.round(snapshot.positionMs)),
      is_playing: snapshot.isPlaying,
      listening_ms_total: total,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "room_id" },
  );
  return { ok: !error };
}

/** Client refetch after a broadcast "queue changed" ping. */
export async function fetchQueue(roomId: string): Promise<QueueItem[]> {
  const viewer = await getRoomViewer();
  return getRoomQueue(roomId, viewer?.id ?? null);
}

/** Resolve a slug to room id (used by the share route, etc.). */
export async function resolveRoom(slug: string) {
  return getRoomBySlug(slug);
}
