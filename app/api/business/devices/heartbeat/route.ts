import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  if (!admin) return NextResponse.json({ ok: false }, { status: 503 });

  const { data: room } = await admin
    .from("rooms")
    .select("id, owner_business_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!room?.owner_business_id) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  await admin
    .from("branches")
    .update({ device_last_seen_at: new Date().toISOString() })
    .eq("room_id", room.id);

  return NextResponse.json({ ok: true });
}
