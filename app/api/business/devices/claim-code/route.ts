import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Redeems a dashboard-initiated pairing code (see registerScreen() in
 * app/business/locations/actions.ts) — the reverse of pair-init/pair-status:
 * the branch + room were already known when the code was generated, so this
 * is one-shot rather than polled. Unauthenticated, same posture as pair-init
 * (kiosks have no session).
 */
export async function POST(request: Request) {
  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const { code } = body;
  if (typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ error: "Missing code." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Pairing isn't configured yet." }, { status: 503 });
  }

  const { data: pairing } = await admin
    .from("device_pairings")
    .select("id, device_token, expires_at, claimed_room_id, origin")
    .eq("code", code.trim())
    .maybeSingle();

  if (
    !pairing ||
    pairing.origin !== "dashboard_initiated" ||
    !pairing.claimed_room_id ||
    new Date(pairing.expires_at).getTime() < Date.now()
  ) {
    return NextResponse.json({ error: "That code is invalid or has expired." }, { status: 404 });
  }

  const { data: room } = await admin
    .from("rooms")
    .select("slug")
    .eq("id", pairing.claimed_room_id)
    .maybeSingle();
  if (!room) {
    return NextResponse.json({ error: "That code is invalid or has expired." }, { status: 404 });
  }

  // Single-use: delete the pairing row so the same code can't be redeemed by
  // a second device by mistake. The device's real identity lives on
  // branch_devices.device_token already — this row was only ever the
  // short-lived handshake.
  await admin.from("device_pairings").delete().eq("id", pairing.id);

  return NextResponse.json({ deviceToken: pairing.device_token, slug: room.slug });
}
