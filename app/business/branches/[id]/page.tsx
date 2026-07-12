import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";

import { getBusinessViewer, canActOnBranch } from "@/lib/business/viewer";
import { getBranch } from "@/lib/business/queries";
import { getRoomBySlug, getRoomQueue } from "@/lib/rooms/queries";
import { BranchDetail } from "@/components/business/branch-detail";
import { BranchQueuePanel } from "@/components/business/branch-queue-panel";

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
  const queue = room ? await getRoomQueue(room.id, null) : [];

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
      {branch.devicePairedAt && (
        <BranchQueuePanel branchId={branch.id} roomId={branch.roomId} initialQueue={queue} />
      )}
    </div>
  );
}
