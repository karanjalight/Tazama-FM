import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { RoomExperience } from "@/components/rooms/room-experience";
import {
  getRoomBySlug,
  getRoomPlayback,
  getRoomQueue,
  isRoomMember,
} from "@/lib/rooms/queries";
import { getRoomViewer } from "@/lib/rooms/viewer";
import { getPlanForAccount } from "@/lib/billing/subscription";
import { listenerCapFor } from "@/lib/billing/plans";
import { getOrigin } from "@/lib/origin";

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

  const viewer = await getRoomViewer();
  if (!viewer) redirect("/login");

  const room = await getRoomBySlug(slug);
  if (!room) notFound();

  const isHost = room.hostId === viewer.id;

  // Private rooms are visible only to the host or invited members.
  if (room.access === "private" && !isHost) {
    const member = await isRoomMember(room.id, viewer.id);
    if (!member) notFound();
  }

  const [hostPlan, initialPlayback, initialQueue, origin] = await Promise.all([
    getPlanForAccount(room.hostId),
    getRoomPlayback(room.id),
    getRoomQueue(room.id, viewer.id),
    getOrigin(),
  ]);

  return (
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
  );
}
