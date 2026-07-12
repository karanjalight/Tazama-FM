import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";

import { getBusinessViewer, canActOnBranch } from "@/lib/business/viewer";
import { getBranch, isOnline, getBranchVolume } from "@/lib/business/queries";
import { getRoomBySlug, getRoomQueue, getRoomPlayback } from "@/lib/rooms/queries";
import { getOrigin } from "@/lib/origin";
import { roomUrl } from "@/lib/rooms/slug";
import { BranchDetail } from "@/components/business/branch-detail";
import { BranchQueuePanel } from "@/components/business/branch-queue-panel";
import { BranchShareCard } from "@/components/business/branch-share-card";

export const metadata: Metadata = { title: "Branch — Business Dashboard" };

export default async function BranchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");
  if (!canActOnBranch(viewer, id)) notFound();

  const branch = await getBranch(viewer.businessId, id);
  if (!branch) notFound();

  const room = await getRoomBySlug(branch.slug);
  const [queue, playback, volume, origin] = await Promise.all([
    room ? getRoomQueue(room.id, null) : Promise.resolve([]),
    room ? getRoomPlayback(room.id) : Promise.resolve(null),
    room ? getBranchVolume(room.id) : Promise.resolve(80),
    getOrigin(),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {branch.name}
        </h1>
      </header>
      <BranchDetail
        branch={branch}
        genres={room?.genres ?? []}
        canManage={viewer.role === "owner" || viewer.role === "admin"}
      />
      {branch.devicePairedAt && room && (
        <BranchQueuePanel
          branchId={branch.id}
          roomId={room.id}
          initialTrack={playback?.track ?? null}
          initialIsPlaying={playback?.isPlaying ?? false}
          initialVolume={volume}
          initialOnline={isOnline(branch.deviceLastSeenAt)}
          initialQueue={queue}
        />
      )}
      <BranchShareCard roomUrl={roomUrl(origin, branch.slug)} />
    </div>
  );
}
