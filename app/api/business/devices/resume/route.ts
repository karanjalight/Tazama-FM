import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Where a previously-paired kiosk should go now. `/pair` calls this with the
 * device's saved token on every load, so a box whose start URL is `/pair`
 * pairs once and then lands straight back on its player after every reboot.
 * Resolved fresh each time (not a cached slug) so a screen moved to another
 * room from the dashboard follows the move.
 *
 * Unauthenticated, same posture as heartbeat/claim-code: the device token is
 * the credential. `unpaired: true` is the one definitive "forget this token"
 * answer (the device row is gone); anything else is retryable.
 */
export async function POST(request: Request) {
  let body: { deviceToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const { deviceToken } = body;
  if (typeof deviceToken !== "string" || !deviceToken) {
    return NextResponse.json({ error: "Missing deviceToken." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Pairing isn't configured yet." }, { status: 503 });
  }

  const { data: device, error } = await admin
    .from("branch_devices")
    .select("name, room_id")
    .eq("device_token", deviceToken)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: "Could not look up this screen." }, { status: 500 });
  }
  if (!device) {
    return NextResponse.json({ error: "This screen is no longer paired.", unpaired: true }, { status: 404 });
  }
  if (!device.room_id) {
    return NextResponse.json(
      { error: "This screen isn't assigned to a room yet.", name: device.name },
      { status: 409 },
    );
  }

  const { data: room } = await admin
    .from("rooms")
    .select("slug")
    .eq("id", device.room_id)
    .maybeSingle();
  if (!room) {
    return NextResponse.json(
      { error: "This screen's room couldn't be found.", name: device.name },
      { status: 409 },
    );
  }

  return NextResponse.json({ slug: room.slug, name: device.name });
}
