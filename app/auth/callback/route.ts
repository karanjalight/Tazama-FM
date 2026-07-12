import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { resolveSiteOrigin } from "@/lib/auth/site-origin";

/**
 * OAuth (Google) redirect target. Exchanges the auth code for a session, then
 * routes the user: existing profiles go to the dashboard, brand-new ones finish
 * onboarding first.
 *
 * Redirects are built from the PUBLIC origin (forwarded host / NEXT_PUBLIC_SITE_URL)
 * so they survive Vercel's proxy. On failure we attach a short `reason` so a
 * production sign-in attempt surfaces *why* (e.g. provider misconfig).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = resolveSiteOrigin({
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    requestOrigin: url.origin,
  });

  const fail = (reason: string) =>
    NextResponse.redirect(
      `${base}/login?error=oauth&reason=${encodeURIComponent(reason.slice(0, 120))}`,
    );

  const code = url.searchParams.get("code");
  if (!code) {
    // Google can also bounce back an explicit error (e.g. access_denied).
    return fail(url.searchParams.get("error") ?? "missing_code");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return fail(error.code ?? error.message ?? "exchange_failed");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let destination = "/dashboard";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", user.id)
      .single();
    if (!profile?.onboarding_complete) destination = "/onboarding";
  }

  return NextResponse.redirect(`${base}${destination}`);
}
