import type { Metadata, Viewport } from "next";

import { KioskPlayer } from "@/components/player/kiosk-player";
import { KioskRoomPlayer } from "@/components/player/kiosk-room-player";
import { resolveKioskPlaylist, kioskTitle } from "@/lib/player/kiosk-playlist";
import { getRoomBySlug, getRoomPlayback } from "@/lib/rooms/queries";

/**
 * Lightweight kiosk player for Android TV boxes (restaurants/clubs/hotels).
 *
 * Point a fullscreen browser at `/<host>/player/<slug>`:
 *  - `<slug>` is a **public room** → a video screen that mirrors that room's
 *    host in real time (see <KioskRoomPlayer>).
 *  - otherwise it's a genre (`afrobeats`, `jazz`, …) or `mix` → a standalone
 *    audio jukebox (see <KioskPlayer>).
 *
 * The page reads no cookies and is briefly cached, so it loads fast on a weak
 * box; the live sync happens client-side over Supabase Realtime. The proxy
 * skips `/player/*` entirely. See docs/KIOSK.md for box setup.
 */
export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const room = await getRoomBySlug(slug);
  return {
    title: `${room?.name ?? kioskTitle(slug)} — Tazama Player`,
    robots: { index: false, follow: false },
  };
}

// Fill the TV screen edge-to-edge.
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

  // A public room slug → mirror the host's live video.
  const room = await getRoomBySlug(slug);
  if (room && room.access === "public") {
    const initialPlayback = await getRoomPlayback(room.id);
    return (
      <KioskRoomPlayer
        room={{ id: room.id, slug: room.slug, name: room.name }}
        hostName={null}
        initialPlayback={initialPlayback}
      />
    );
  }

  // Otherwise: a genre / mix audio jukebox.
  const { title, tracks } = await resolveKioskPlaylist(slug);
  return <KioskPlayer slug={slug} title={title} tracks={tracks} />;
}
