import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ZoneExperience } from "@/components/zones/zone-experience";
import { getAudioZoneBySlug } from "@/lib/business/audio-zone-queries";
import { getZoneQueue } from "@/lib/business/zone-queue";
import { getRoomViewer } from "@/lib/rooms/viewer";
import { getOrCreateGuestViewer } from "@/lib/rooms/guest-session";
import { getRoomPlayback } from "@/lib/rooms/queries";
import { getOrigin } from "@/lib/origin";
import { GuestSessionSync } from "@/components/rooms/guest-session-sync";

// A zone room is live state — always render fresh, never cache.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const zone = await getAudioZoneBySlug(slug);
  return { title: zone ? zone.name : "Zone" };
}

export default async function ZoneRoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const zone = await getAudioZoneBySlug(slug);
  if (!zone) notFound();

  // Every Audio Zone is business-owned by construction (unlike a personal
  // Room), so guest access is unconditional here — no per-target ownership
  // check the way Rooms' own page needs one.
  let viewer = await getRoomViewer();
  let isGuest = false;
  if (!viewer) {
    viewer = await getOrCreateGuestViewer();
    isGuest = true;
  }
  if (!viewer) redirect("/login");

  // Only a `synchronized_playback` zone has its own canonical playback row
  // (`zone.playback`, already fetched in `getAudioZoneBySlug`); every other
  // zone (the default) has its covered room playing independently via
  // `room_playback` — the same source the room's own kiosk reads — so that's
  // what a joiner needs seeded here instead (see `resolvePlaybackTarget`).
  const primaryRoomId = zone.roomIds[0] ?? null;
  const [initialQueue, initialRoomPlayback, origin] = await Promise.all([
    getZoneQueue(zone.id, viewer.id),
    zone.synchronizedPlayback || !primaryRoomId ? Promise.resolve(null) : getRoomPlayback(primaryRoomId),
    getOrigin(),
  ]);

  return (
    <>
      {isGuest && <GuestSessionSync />}
      <ZoneExperience
        zone={zone}
        viewer={viewer}
        initialQueue={initialQueue}
        initialRoomPlayback={initialRoomPlayback}
        origin={origin}
      />
    </>
  );
}
