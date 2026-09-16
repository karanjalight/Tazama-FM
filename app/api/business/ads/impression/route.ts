import { NextResponse } from "next/server";

import { recordAdImpression } from "@/lib/business/ad-serving";

/**
 * Kiosk-facing, unauthenticated — the ad play counter. A kiosk calls this with
 * `phase: "start"` when it begins showing an airing and `phase: "end"` when it
 * finishes (also sent as a `pagehide` beacon). Each player counts at most once
 * per airing, and only if the airing actually covers it.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { breakId, roomId, deviceToken, phase, completed, durationMs } = body;
  if (typeof breakId !== "string" || !breakId || typeof roomId !== "string" || !roomId) {
    return NextResponse.json({ error: "Missing breakId or roomId." }, { status: 400 });
  }
  if (phase !== "start" && phase !== "end") {
    return NextResponse.json({ error: "phase must be start or end." }, { status: 400 });
  }

  const result = await recordAdImpression({
    breakId,
    roomId,
    deviceToken: typeof deviceToken === "string" && deviceToken ? deviceToken : null,
    phase,
    completed: completed === true,
    durationMs: typeof durationMs === "number" && Number.isFinite(durationMs) ? Math.max(0, Math.round(durationMs)) : null,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
