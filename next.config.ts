import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this app so Turbopack doesn't infer a parent
  // directory (the repo sits beside a Django backend).
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    // Track artwork is served straight from YouTube's thumbnail CDN.
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
};

export default nextConfig;
