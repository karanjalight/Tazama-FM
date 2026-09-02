import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ZoneExperience } from "@/components/zones/zone-experience";
import { getAudioZoneBySlug } from "@/lib/business/audio-zone-queries";
import { getZoneQueue } from "@/lib/business/zone-queue";
import { getRoomViewer } from "@/lib/rooms/viewer";
import { getOrCreateGuestViewer } from "@/lib/rooms/guest-session";
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

  const [initialQueue, origin] = await Promise.all([getZoneQueue(zone.id, viewer.id), getOrigin()]);

  return (
    <>
      {isGuest && <GuestSessionSync />}
      <ZoneExperience zone={zone} viewer={viewer} initialQueue={initialQueue} origin={origin} />
    </>
  );
}
