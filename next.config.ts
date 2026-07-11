import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this app so Turbopack doesn't infer a parent
  // directory (the repo sits beside a Django backend).
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    // Track artwork is served straight from YouTube's thumbnail CDN, which is
    // already pre-sized — Vercel's on-the-fly re-optimization adds no value
    // here and its Image Optimization quota was getting exhausted (402s in
    // production), so skip the transform step entirely.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
};

export default nextConfig;
