import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { RoomExperience } from "@/components/rooms/room-experience";
import { LikesProvider } from "@/components/likes/likes-provider";
import {
  getRoomBySlug,
  getRoomPlayback,
  getRoomQueue,
  isRoomMember,
} from "@/lib/rooms/queries";
import { getRoomViewer } from "@/lib/rooms/viewer";
import { getCurrentProfile } from "@/lib/auth/profile";
import { listLikedIds } from "@/lib/likes/store";
import { getPlanForAccount } from "@/lib/billing/subscription";
import { listenerCapFor } from "@/lib/billing/plans";
import { getOrigin } from "@/lib/origin";
import { getOrCreateGuestViewer } from "@/lib/rooms/guest-session";
import { GuestSessionSync } from "@/components/rooms/guest-session-sync";

// A room is live state — always render fresh, never cache.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const room = await getRoomBySlug(slug);
  return { title: room ? room.name : "Room" };
}

export default async function RoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const room = await getRoomBySlug(slug);
  if (!room) notFound();

  const isBranch = !!room.ownerBusinessId;

  let viewer = await getRoomViewer();
  let isGuest = false;
  if (!viewer && isBranch) {
    viewer = await getOrCreateGuestViewer();
    isGuest = true;
  }
  if (!viewer) redirect("/login");

  const isHost = room.hostId === viewer.id;

  // Private rooms are visible only to the host or invited members — except a
  // branch, which is "unlisted, but shareable by direct link," not invite-only.
  if (room.access === "private" && !isHost && !isBranch) {
    const member = await isRoomMember(room.id, viewer.id);
    if (!member) notFound();
  }

  // Personal likes are attributed to the signed-in user (null for demo/anon
  // guests, in which case hearts stay hidden in the room).
  const profile = await getCurrentProfile();
  const [hostPlan, initialPlayback, initialQueue, origin, likedIds] =
    await Promise.all([
      getPlanForAccount(room.hostId),
      getRoomPlayback(room.id),
      getRoomQueue(room.id, viewer.id),
      getOrigin(),
      profile ? listLikedIds(profile.id) : Promise.resolve<string[]>([]),
    ]);

  return (
    <LikesProvider initialLikedIds={likedIds} enabled={!!profile}>
      {isGuest && <GuestSessionSync />}
      <RoomExperience
        room={room}
        viewer={viewer}
        isHost={isHost}
        hostPlan={hostPlan}
        listenerCap={listenerCapFor(hostPlan)}
        initialPlayback={initialPlayback}
        initialQueue={initialQueue}
        origin={origin}
      />
    </LikesProvider>
  );
}
