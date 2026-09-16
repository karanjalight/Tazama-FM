"use server";

/**
 * Pair with a Screen mutations. Every action re-resolves the actor (Server
 * Functions are reachable by direct POST) and writes through the
 * service-role client, with ownership enforced here in app code.
 */
import { cookies } from "next/headers";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { getRoomViewer } from "@/lib/rooms/viewer";
import { ensureGuestCookie } from "@/lib/rooms/guest-actions";
import { PAIR_NAME_COOKIE, resolvePairActor } from "@/lib/pair/identity";
import { getPairDeviceBySlug, getPairState, readSourcePlayback } from "@/lib/pair/queries";
import { resolveRoomSource, sourceRoomIds } from "@/lib/pair/room-source";
import { checkRequest, cleanDisplayName } from "@/lib/pair/request-rules";
import type { PairState } from "@/lib/pair/types";
import type { RoomTrack } from "@/lib/rooms/types";

type ActionResult = { ok: true } | { ok: false; error: string };

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const NOT_PAIRED: ActionResult = { ok: false, error: "Pair with the screen first." };

const trackSchema = z.object({
  youtubeId: z.string().min(1).max(32),
  title: z.string().max(300).default(""),
  artist: z.string().max(300).nullable().default(null),
  thumbnailUrl: z.string().max(1000).nullable().default(null),
});

const idSchema = z.uuid();

export async function pairWithDevice(rawName: string): Promise<ActionResult> {
  const name = cleanDisplayName(typeof rawName === "string" ? rawName : "");
  if (!name) return { ok: false, error: "Add your name so everyone knows who's here." };

  if (!(await getRoomViewer())) await ensureGuestCookie();
  const store = await cookies();
  store.set(PAIR_NAME_COOKIE, name, { maxAge: ONE_YEAR_SECONDS, path: "/", sameSite: "lax", httpOnly: true });
  return { ok: true };
}

export async function requestSong(deviceSlug: string, track: RoomTrack): Promise<ActionResult> {
  const actor = await resolvePairActor();
  if (!actor) return NOT_PAIRED;
  const parsed = trackSchema.safeParse(track);
  if (!parsed.success) return { ok: false, error: "That song couldn't be added." };

  const device = await getPairDeviceBySlug(deviceSlug);
  if (!device?.roomId) return { ok: false, error: "This screen isn't available right now." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Requests aren't available right now." };

  const source = await resolveRoomSource(device.roomId);
  const roomIds = await sourceRoomIds(admin, source);
  const [mine, inRoom, duplicate, playback] = await Promise.all([
    admin
      .from("venue_requests")
      .select("id", { count: "exact", head: true })
      .eq("room_id", device.roomId)
      .eq("status", "queued")
      .eq("added_by", actor.id),
    admin
      .from("venue_requests")
      .select("id", { count: "exact", head: true })
      .eq("room_id", device.roomId)
      .eq("status", "queued"),
    admin
      .from("venue_requests")
      .select("id")
      .in("room_id", roomIds.length ? roomIds : [device.roomId])
      .eq("status", "queued")
      .eq("track->>youtubeId", parsed.data.youtubeId)
      .limit(1),
    readSourcePlayback(admin, source),
  ]);
  if (mine.error || inRoom.error) return { ok: false, error: "Requests aren't available at this venue yet." };

  const check = checkRequest({
    queuedByActor: mine.count ?? 0,
    queuedInRoom: inRoom.count ?? 0,
    alreadyQueued: (duplicate.data?.length ?? 0) > 0,
    isNowPlaying: playback.track?.youtubeId === parsed.data.youtubeId,
  });
  if (!check.ok) return check;

  const { error } = await admin.from("venue_requests").insert({
    room_id: device.roomId,
    track: parsed.data,
    added_by: actor.id,
    added_by_name: actor.name,
  });
  return error ? { ok: false, error: "Couldn't add that song. Try again." } : { ok: true };
}

export async function removeRequest(requestId: string): Promise<ActionResult> {
  const actor = await resolvePairActor();
  if (!actor) return NOT_PAIRED;
  if (!idSchema.safeParse(requestId).success) return { ok: false, error: "Request not found." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Requests aren't available right now." };

  const { data, error } = await admin
    .from("venue_requests")
    .delete()
    .eq("id", requestId)
    .eq("added_by", actor.id)
    .eq("status", "queued")
    .select("id");
  if (error || !data?.length) return { ok: false, error: "That song is already playing or isn't yours." };
  return { ok: true };
}

export async function toggleRequestLike(requestId: string): Promise<ActionResult> {
  const actor = await resolvePairActor();
  if (!actor) return NOT_PAIRED;
  if (!idSchema.safeParse(requestId).success) return { ok: false, error: "Request not found." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Requests aren't available right now." };

  const { data: existing } = await admin
    .from("venue_request_likes")
    .select("request_id")
    .eq("request_id", requestId)
    .eq("actor_id", actor.id)
    .maybeSingle();

  const { error } = existing
    ? await admin.from("venue_request_likes").delete().eq("request_id", requestId).eq("actor_id", actor.id)
    : await admin.from("venue_request_likes").insert({ request_id: requestId, actor_id: actor.id });
  return error ? { ok: false, error: "Couldn't update your like." } : { ok: true };
}

/** Client refresh — after a realtime change, a queue ping, or the poll. */
export async function fetchPairState(deviceSlug: string): Promise<PairState | null> {
  const device = await getPairDeviceBySlug(deviceSlug);
  if (!device?.roomId) return null;
  const actor = await resolvePairActor();
  return getPairState(device.roomId, actor?.id ?? null);
}
