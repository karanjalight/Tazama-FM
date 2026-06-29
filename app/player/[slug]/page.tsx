import type { Metadata, Viewport } from "next";

import { KioskPlayer } from "@/components/player/kiosk-player";
import { resolveKioskPlaylist, kioskTitle } from "@/lib/player/kiosk-playlist";

/**
 * Lightweight kiosk player for Android TV boxes (restaurants/clubs/hotels).
 *
 * Point a fullscreen browser at `/<host>/player/<slug>` where `<slug>` is a
 * genre (`afrobeats`, `amapiano`, `jazz`, …) or `mix` for a broad blend. The
 * page is ISR-cached and reads no cookies, so it loads fast even on a weak box;
 * all the playback logic lives in the small <KioskPlayer> client island — no
 * dashboard chrome, no framer-motion. See docs/KIOSK.md for box setup.
 */
export const revalidate = 1800; // refresh the catalog every 30 min

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${kioskTitle(slug)} — Tazama Player`,
    robots: { index: false, follow: false },
  };
}

// Fill the TV screen edge-to-edge and keep it awake-friendly.
export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { title, tracks } = await resolveKioskPlaylist(slug);

  return <KioskPlayer slug={slug} title={title} tracks={tracks} />;
}
