/**
 * Navigate to `path` after an auth state change (sign-in / sign-up / sign-out).
 *
 * Uses a **hard** document navigation instead of `router.push()` +
 * `router.refresh()`. Here's why that matters:
 *
 * Client-side Supabase auth writes the session cookie in the browser, then we
 * need the next request to be recognized as signed-in by `proxy.ts`. A *soft*
 * App Router navigation fails this on two fronts:
 *
 *  1. **Stale Router Cache.** Next.js 16 prefetches links aggressively. An
 *     auth-gated route (`/dashboard`) prefetched while signed-out gets its
 *     `proxy.ts` redirect-to-`/login` cached; after sign-in `router.push()` can
 *     replay that stale entry. `router.refresh()` races it and loses on slow CPUs.
 *  2. **Cookie propagation race.** The just-written cookie isn't always visible
 *     to the proxy's `getUser()` on the immediate soft-nav RSC fetch.
 *
 * A full load re-runs `proxy.ts` with the fresh cookie and bypasses the Router
 * Cache, so the destination resolves correctly every time. This is essential on
 * low-power Android TV boxes where the soft-nav race reliably loses; desktop
 * behavior is unchanged (it still lands on the destination).
 */
export function navigateAfterAuth(path: string): void {
  if (typeof window === "undefined") return;
  window.location.assign(path);
}
