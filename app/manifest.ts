import type { MetadataRoute } from "next";

/**
 * PWA web app manifest. Next injects `<link rel="manifest">` automatically.
 *
 * `start_url: "/dashboard"` makes an installed launch auth-aware for free:
 * `lib/supabase/session.ts` redirects an unauthenticated launch to `/login`
 * and lets signed-in users into the dashboard.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Tazama — Listen together",
    short_name: "Tazama",
    description:
      "Social listening in real time. Create a room, share a link, and everyone hears the same song at the same moment.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    categories: ["music", "entertainment", "social"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
