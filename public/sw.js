/**
 * Tazama service worker — deliberately conservative so the dynamic, auth'd app
 * never serves stale content:
 *   • static assets (/_next/static, /icons, fonts, images, manifest) → cache-first
 *   • navigations → network-first, falling back to the offline page
 *   • everything else (Supabase / auth / API) → network-only passthrough
 * Its job is installability + an offline fallback, not full offline support.
 */
const CACHE = "tazama-static-v2";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(?:woff2?|ttf|otf|png|svg|ico|jpe?g|webp|gif)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Cross-origin (YouTube, Supabase, fonts CDN…) → let the browser handle it.
  if (url.origin !== self.location.origin) return;

  // Navigations: always try the network first; offline → branded fallback.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Static assets: cache-first, then backfill the cache.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req)
            .then((res) => {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(req, copy));
              return res;
            })
            .catch(() => cached),
      ),
    );
    return;
  }

  // Everything else (API / auth / data) → network-only passthrough (no respondWith).
});
