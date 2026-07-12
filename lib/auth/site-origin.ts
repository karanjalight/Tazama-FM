/**
 * Resolve the PUBLIC origin to redirect to after the OAuth code exchange.
 *
 * Behind a proxy (Vercel), `new URL(request.url).origin` can be an internal host
 * rather than the user-facing one, which would bounce a freshly-authenticated
 * user to the wrong origin (and drop the session cookies just set for the public
 * host). Prefer the forwarded host the user actually hit, then a configured site
 * URL, then the request origin as a last resort. Pure — unit-tested.
 */
export function resolveSiteOrigin(input: {
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  siteUrl?: string | null;
  requestOrigin: string;
}): string {
  const strip = (s: string) => s.replace(/\/+$/, "");

  if (input.forwardedHost) {
    const proto = input.forwardedProto || "https";
    return `${proto}://${input.forwardedHost}`;
  }
  if (input.siteUrl && /^https?:\/\//.test(input.siteUrl)) {
    return strip(input.siteUrl);
  }
  return strip(input.requestOrigin);
}
