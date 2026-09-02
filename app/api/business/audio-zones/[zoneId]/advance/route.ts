import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { advanceZonePlayback } from "@/lib/business/audio-zone-playback";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ zoneId: string }> },
) {
  const { zoneId } = await params;
  let reportedVersion: unknown;
  try {
    ({ reportedVersion } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof reportedVersion !== "number") {
    return NextResponse.json({ error: "Missing reportedVersion." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const result = await advanceZonePlayback(admin, zoneId, reportedVersion);
  if (!result.ok) {
    const status = result.error === "Audio zone playback not initialized." ? 404 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ track: result.track, version: result.version });
}
