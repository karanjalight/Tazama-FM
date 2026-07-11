import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Pairing isn't configured yet." },
      { status: 503 },
    );
  }

  const { data: pairing } = await admin
    .from("device_pairings")
    .select("expires_at, claimed_branch_id")
    .eq("device_token", token)
    .maybeSingle();

  if (!pairing || new Date(pairing.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ status: "expired" });
  }
  if (!pairing.claimed_branch_id) {
    return NextResponse.json({ status: "pending" });
  }

  const { data: branch } = await admin
    .from("branches")
    .select("slug")
    .eq("id", pairing.claimed_branch_id)
    .maybeSingle();
  if (!branch) {
    return NextResponse.json({ status: "expired" });
  }

  return NextResponse.json({ status: "claimed", slug: branch.slug });
}
