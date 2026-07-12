import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { DEMO_AUTH, DEMO_COOKIE } from "@/lib/demo/demo-session";

/** Paths that should bounce a *signed-in* user away to the dashboard. */
const AUTH_ONLY_PATHS = ["/login", "/signup"];

/** Paths that require a signed-in user. */
const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/business"];

/**
 * Refreshes the Supabase auth session on every request and enforces coarse
 * route protection. Fine-grained checks (e.g. "is onboarding complete?") live
 * in the relevant Server Components, which already read the profile.
 *
 * Called from the root `proxy.ts` (Next.js 16's renamed middleware).
 */
export async function updateSession(request: NextRequest) {
  // The kiosk player (`/player/*`) and the device-pairing screen
  // (`/business/pair`) are public and unauthenticated — skip the Supabase
  // round-trip so a freshly-booted TV box loads instantly.
  if (
    request.nextUrl.pathname.startsWith("/player") ||
    request.nextUrl.pathname === "/business/pair"
  ) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() must run so the session cookie is refreshed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthOnly = AUTH_ONLY_PATHS.includes(pathname);

  // A simulated demo session counts as authenticated for route protection.
  const hasDemo = DEMO_AUTH && !!request.cookies.get(DEMO_COOKIE)?.value;
  const authed = !!user || hasDemo;

  if (!authed && isProtected) {
    return redirectKeepingCookies(request, response, "/login");
  }

  if (authed && isAuthOnly) {
    return redirectKeepingCookies(request, response, "/dashboard");
  }

  return response;
}

/** Redirect while carrying over any refreshed auth cookies. */
function redirectKeepingCookies(
  request: NextRequest,
  response: NextResponse,
  to: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = to;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
