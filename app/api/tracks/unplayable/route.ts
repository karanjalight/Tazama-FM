import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEMO_AUTH, DEMO_COOKIE, parseDemoCookie } from "@/lib/demo/demo-session";

/**
 * Flag a track as unplayable.
 *
 *   POST { youtubeId }  →  { ok: true }
 *
 * Called by the player when YouTube reports an embed/playback error
 * (codes 2 / 100 / 101 / 150) so the dead video stops surfacing in feeds and
 * suggestions. Writing the shared `tracks` catalog needs the service-role key,
 * so — like /api/tracks/seed — it happens only here, never from the client.
 */
export async function POST(request: Request) {
  let youtubeId: unknown;
  try {
    ({ youtubeId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof youtubeId !== "string" || !youtubeId) {
    return NextResponse.json({ error: "Missing youtubeId." }, { status: 400 });
  }

  // ── Auth: a real Supabase session, or a demo session (mirrors the seed route) ─
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

  // ── Catalog write needs the service-role key ──────────────────────────────
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured." },
      { status: 503 },
    );
  }

  const { error } = await admin
    .from("tracks")
    .update({ is_playable: false })
    .eq("youtube_id", youtubeId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
