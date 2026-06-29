import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rowToTrack } from "@/lib/tracks";
import { DEMO_AUTH, DEMO_COOKIE, parseDemoCookie } from "@/lib/demo/demo-session";

/**
 * Paginated "fresh tracks" feed for the dashboard's New-on-Tazama grid.
 *
 *   GET /api/tracks/discover?offset=48&limit=16  →  { tracks: Track[] }
 *
 * Newest playable tracks, oldest-of-the-new last. Auth-gated like the other
 * track routes; reads the shared catalog with the service-role key.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const offset = Math.max(0, Number.parseInt(searchParams.get("offset") ?? "0", 10) || 0);
  const limit = Math.min(48, Math.max(1, Number.parseInt(searchParams.get("limit") ?? "16", 10) || 16));

  // ── Auth: a real Supabase session, or a demo session ──────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let authed = !!user;
  if (!authed && DEMO_AUTH) {
    const store = await cookies();
    authed = !!parseDemoCookie(store.get(DEMO_COOKIE)?.value);
  }
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ tracks: [] });

  const { data, error } = await admin
    .from("tracks")
    .select("*")
    .eq("is_playable", true)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !data) return NextResponse.json({ tracks: [] });
  return NextResponse.json({
    tracks: (data as Parameters<typeof rowToTrack>[0][]).map(rowToTrack),
  });
}
