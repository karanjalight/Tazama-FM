import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/profile";
import { initSubscriptionCheckout } from "@/lib/billing/paystack";
import { getOrigin } from "@/lib/origin";

/** POST { plan, callbackPath } → { authorizationUrl } — start a Paystack checkout. */
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

  let body: { plan?: unknown; callbackPath?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.plan !== "individual" && body.plan !== "business") {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }
  const next =
    typeof body.callbackPath === "string" ? body.callbackPath : "/dashboard";

  const origin = await getOrigin();
  const callbackUrl = `${origin}/billing/callback?next=${encodeURIComponent(next)}`;

  const result = await initSubscriptionCheckout({
    email: profile.email,
    plan: body.plan,
    accountId: profile.id,
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
