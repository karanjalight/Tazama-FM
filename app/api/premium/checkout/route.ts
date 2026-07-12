import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/profile";
import { initAiPremiumCheckout } from "@/lib/billing/paystack";
import { getOrigin } from "@/lib/origin";

/**
 * POST { callbackPath? } → { authorizationUrl } — start a Paystack checkout for
 * the AI premium add-on. The browser redirects to the returned URL; on return,
 * /billing/callback verifies and grants premium (the webhook is the durable
 * source of truth).
 */
export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile.email) {
    return NextResponse.json(
      { error: "Your account has no email for billing." },
      { status: 400 },
    );
  }

  let next = "/dashboard/chat";
  try {
    const body = (await request.json()) as { callbackPath?: unknown };
    if (typeof body.callbackPath === "string" && body.callbackPath.startsWith("/")) {
      next = body.callbackPath;
    }
  } catch {
    // no body — use the default landing path
  }

  const origin = await getOrigin();
  const callbackUrl = `${origin}/billing/callback?next=${encodeURIComponent(next)}`;

  const result = await initAiPremiumCheckout({
    email: profile.email,
    userId: profile.id,
    callbackUrl,
  });

  if (result.error || !result.authorizationUrl) {
    return NextResponse.json(
      { error: result.error ?? "Could not start checkout." },
      { status: 400 },
    );
  }
  return NextResponse.json({ authorizationUrl: result.authorizationUrl });
}
