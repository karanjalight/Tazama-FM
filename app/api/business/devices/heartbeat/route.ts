import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let body: { slug?: unknown; deviceToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const { slug, deviceToken } = body;
  if (typeof slug !== "string" || !slug) {
    return NextResponse.json({ error: "Missing slug." }, { status: 400 });
  }
  if (typeof deviceToken !== "string" || !deviceToken) {
    return NextResponse.json({ error: "Missing deviceToken." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false }, { status: 503 });

  // Find the device by its token first. Looking it up via the slug's room
  // (`branches.room_id`) only ever matched the branch's primary room, so a
  // screen registered to any other room of the location never went online.
  const [{ data: device }, { data: room }] = await Promise.all([
    admin
      .from("branch_devices")
      .select("id, branch_id")
      .eq("device_token", deviceToken)
      .maybeSingle(),
    admin.from("rooms").select("id, branch_id").eq("slug", slug).maybeSingle(),
  ]);
  // An unrecognized/forgotten token silently no-ops rather than erroring.
  if (!device || !room) return NextResponse.json({ ok: false }, { status: 404 });

  // Only count a device playing one of its OWN location's rooms — either a
  // room the location owns (`rooms.branch_id`) or the location's primary room.
  let sameBranch = room.branch_id === device.branch_id;
  if (!sameBranch) {
    const { data: branch } = await admin
      .from("branches")
      .select("room_id")
      .eq("id", device.branch_id)
      .maybeSingle();
    sameBranch = branch?.room_id === room.id;
  }
  if (!sameBranch) return NextResponse.json({ ok: false }, { status: 404 });

  const seenAt = new Date().toISOString();
  await Promise.all([
    admin.from("branch_devices").update({ last_seen_at: seenAt }).eq("id", device.id),
    // "some device for this branch was just seen" — the signal that
    // getBusinessOverview and the branch detail page's online badge read.
    admin.from("branches").update({ device_last_seen_at: seenAt }).eq("id", device.branch_id),
  ]);

  return NextResponse.json({ ok: true });
}
