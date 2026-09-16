/**
 * The playback side of Pair with a Screen song requests (`venue_requests`):
 * every advance path calls `claimNextRequest` before its own "what's next"
 * logic, so a guest's request plays next whichever source is driving the
 * room. SERVER ONLY.
 *
 * All reads here are error-tolerant on purpose: before
 * supabase/business-pair-requests.sql is applied the table doesn't exist,
 * and advancing must then behave exactly as it did before this feature.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { asRoomTrack } from "@/lib/pair/room-track";
import type { RoomTrack } from "@/lib/rooms/types";

/** How many oldest candidates to try claiming before giving up for this
 * advance — only exceeded if several kiosks race on the same queue at once. */
const CLAIM_CANDIDATES = 5;
const PLAYED_RETENTION_MS = 24 * 60 * 60 * 1000;

export interface ClaimedRequest {
  id: string;
  track: RoomTrack;
}

/**
 * Claims the oldest queued request across `roomIds` (first come, first
 * served). The claim is a conditional update (`status = 'queued'` still
 * true), so two kiosks advancing at once can never both play the same
 * request. Callers whose own playback write then loses a CAS race must hand
 * it back with `releaseRequest`.
 */
export async function claimNextRequest(admin: SupabaseClient, roomIds: string[]): Promise<ClaimedRequest | null> {
  if (!roomIds.length) return null;

  const { data, error } = await admin
    .from("venue_requests")
    .select("id, track")
    .in("room_id", roomIds)
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(CLAIM_CANDIDATES);
  if (error || !data?.length) return null;

  for (const row of data as { id: string; track: unknown }[]) {
    const { data: claimed, error: claimError } = await admin
      .from("venue_requests")
      .update({ status: "played", claimed_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("status", "queued")
      .select("id")
      .maybeSingle();
    if (claimError || !claimed) continue;

    const track = asRoomTrack(row.track);
    if (!track) continue; // malformed row — consumed, never played

    await admin
      .from("venue_requests")
      .delete()
      .in("room_id", roomIds)
      .eq("status", "played")
      .lt("claimed_at", new Date(Date.now() - PLAYED_RETENTION_MS).toISOString());
    return { id: row.id, track };
  }
  return null;
}

/** Puts a claimed request back in line. It keeps its original `created_at`,
 * so it's still first in line on the next advance. */
export async function releaseRequest(admin: SupabaseClient, requestId: string): Promise<void> {
  await admin
    .from("venue_requests")
    .update({ status: "queued", claimed_at: null })
    .eq("id", requestId)
    .eq("status", "played");
}
