import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Public, unauthenticated — pinged periodically by any branch room's active
 * viewers (guest or real) so the business dashboard can show a live visitor
 * count. Guests deliberately never join room_members, so this is the only
 * durable signal of "who's actually here right now." Fails closed on any
 * unrecognized/malformed input; never errors loudly to a public caller.
 */
export async function POST(request: Request) {
  let body: { roomId?: unknown; actorId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const { roomId, actorId } = body;
  if (typeof roomId !== "string" || typeof actorId !== "string" || !roomId || !actorId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false }, { status: 503 });

  // Presence is scoped to branch rooms only — consumer rooms never get
  // presence data, and forging a roomId for an arbitrary/non-branch room
  // must not write anything.
  const { data: room } = await admin
    .from("rooms")
    .select("id, owner_business_id")
    .eq("id", roomId)
    .maybeSingle();
  if (!room?.owner_business_id) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  await admin.from("room_presence").upsert(
    { room_id: roomId, actor_id: actorId, last_seen_at: new Date().toISOString() },
    { onConflict: "room_id,actor_id" },
  );

  // Housekeeping: prune stale presence rows for this room (mirrors the
  // room_queue prune-on-write pattern used elsewhere).
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await admin
    .from("room_presence")
    .delete()
    .eq("room_id", roomId)
    .lt("last_seen_at", cutoff);

  return NextResponse.json({ ok: true });
}
