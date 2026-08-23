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

  const { data: room } = await admin
    .from("rooms")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!room) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  // Only touch a device row that's actually paired to THIS branch's room —
  // an unrecognized/forgotten token silently no-ops rather than erroring.
  const { data: branch } = await admin
    .from("branches")
    .select("id")
    .eq("room_id", room.id)
    .maybeSingle();
  if (!branch) return NextResponse.json({ ok: false }, { status: 404 });

  const seenAt = new Date().toISOString();

  const { data: matchedDevice } = await admin
    .from("branch_devices")
    .update({ last_seen_at: seenAt })
    .eq("branch_id", branch.id)
    .eq("device_token", deviceToken)
    .select("id")
    .maybeSingle();

  // Only bump the branch-level signal if the token actually matched a real
  // device row for this branch — otherwise a forgotten/stale token would
  // repopulate device_last_seen_at and make the dashboard show the branch as
  // online again with zero actual devices.
  if (matchedDevice) {
    // "some device for this branch was just seen" — the signal that
    // getBusinessOverview and the branch detail page's online badge read.
    await admin
      .from("branches")
      .update({ device_last_seen_at: seenAt })
      .eq("id", branch.id);
  }

  return NextResponse.json({ ok: true });
}
