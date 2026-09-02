import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";

import { getBusinessViewer, canActOnBranch } from "@/lib/business/viewer";
import { getBranchByIdOrSlug } from "@/lib/business/queries";
import { getSchedule } from "@/lib/business/schedule-queries";
import { listContentItems, listPlaylists } from "@/lib/business/content-queries";
import { ScheduleDetailView } from "@/components/business/schedules/detail/schedule-detail-view";

export const metadata: Metadata = { title: "Schedule — Business Dashboard" };

export default async function ScheduleDetailPage({
  params,
}: {
  params: Promise<{ id: string; scheduleId: string }>;
}) {
  const { id, scheduleId } = await params;
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  const branch = await getBranchByIdOrSlug(viewer.businessId, id);
  if (!branch || !canActOnBranch(viewer, branch.id)) notFound();

  const schedule = await getSchedule(branch.id, scheduleId);
  if (!schedule) notFound();

  const [content, ads, playlists] = await Promise.all([
    listContentItems(viewer.businessId, { purpose: "content" }).then((items) => items.filter((i) => i.status === "approved")),
    listContentItems(viewer.businessId, { purpose: "ad_creative" }).then((items) => items.filter((i) => i.status === "approved")),
    listPlaylists(viewer.businessId),
  ]);

  return (
    <ScheduleDetailView
      branchId={branch.id}
      branchSlugOrId={branch.slug}
      schedule={schedule}
      businessContent={content}
      businessAds={ads}
      businessPlaylists={playlists}
    />
  );
}
