import { headers } from "next/headers";

import { resolveSiteOrigin } from "@/lib/auth/site-origin";

/**
 * Best-effort request origin for share links, checkout callback URLs, etc.
 * SERVER ONLY.
 *
 * Mirrors resolveSiteOrigin's precedence: the actual forwarded host wins over
 * NEXT_PUBLIC_SITE_URL, so a stale/misconfigured env var (e.g. left at the
 * dev default) can't send production redirects back to localhost.
 */
export async function getOrigin(): Promise<string> {
  const h = await headers();
  return resolveSiteOrigin({
    forwardedHost: h.get("x-forwarded-host"),
    forwardedProto: h.get("x-forwarded-proto"),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    requestOrigin: `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`,
  });
}
