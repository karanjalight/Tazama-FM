import { NextResponse } from "next/server";

import { tickAds } from "@/lib/business/ad-serving";

/**
 * Kiosk-facing, unauthenticated — same trust model as heartbeat/advance/
 * active-schedule. Polled by a branch kiosk (~30s) to start a due ad airing on
 * whatever this room is playing, or learn about the one already on air (a
 * late-joining screen shows the rest of it). Body: `{ deviceToken? }` — the
 * kiosk's persisted `tz_device_token`, which lets per-screen targeting apply.
 */
export async function POST(request: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;

  let deviceToken: string | null = null;
  try {
    const body = (await request.json()) as { deviceToken?: unknown };
    if (typeof body?.deviceToken === "string" && body.deviceToken) deviceToken = body.deviceToken;
  } catch {
    // No body — an unpaired player.
  }

  const result = await tickAds(roomId, deviceToken);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
