import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileText, HardDrive, Image as ImageIcon, Music, Video } from "lucide-react";

import { getBusinessViewer } from "@/lib/business/viewer";
import { listContentItems } from "@/lib/business/content-queries";
import { formatFileSize } from "@/lib/business/content-format";
import { ContentLibraryWorkspace } from "@/components/business/content-library/content-library-workspace";
import { UploadContentDialog } from "@/components/business/content-library/upload-content-dialog";
import { StatTile, type StatItem } from "@/components/business/stat-tile";

export const metadata: Metadata = { title: "Content Library — Business Dashboard" };

/**
 * Content is scoped to the BUSINESS, not to one location (see
 * supabase/business-content.sql's own comment) — this is a top-level
 * `/business/...` route, same as Settings, not nested under any one branch.
 */
export default async function ContentLibraryPage() {
  const viewer = await getBusinessViewer();
  if (!viewer) redirect("/login");

  const items = await listContentItems(viewer.businessId, { purpose: "content" });

  const stats = buildContentStats(items);
  const canModerate = viewer.role === "owner" || viewer.role === "admin";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Content Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage all media content available for your screens, across every location.
          </p>
        </div>
        <UploadContentDialog />
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat, i) => (
          <StatTile key={stat.key} stat={stat} delayMs={i * 40} />
        ))}
      </div>

      <ContentLibraryWorkspace
        businessId={viewer.businessId}
        items={items}
        canModerate={canModerate}
      />
    </div>
  );
}

function buildContentStats(items: Awaited<ReturnType<typeof listContentItems>>): StatItem[] {
  const videos = items.filter((i) => i.contentType === "video");
  const images = items.filter((i) => i.contentType === "image");
  const audio = items.filter((i) => i.contentType === "audio");
  const documents = items.filter((i) => i.contentType === "document");
  const totalBytes = items.reduce((sum, i) => sum + i.sizeBytes, 0);
  const total = items.length;
  const pct = (n: number) => (total ? `${((n / total) * 100).toFixed(1)}%` : "0%");

  return [
    { key: "total", label: "Total Content", value: String(total), sublabel: "All media", icon: HardDrive, color: "violet" },
    { key: "videos", label: "Videos", value: String(videos.length), sublabel: pct(videos.length), icon: Video, color: "blue" },
    { key: "images", label: "Images", value: String(images.length), sublabel: pct(images.length), icon: ImageIcon, color: "emerald" },
    { key: "audio", label: "Audio", value: String(audio.length), sublabel: pct(audio.length), icon: Music, color: "amber" },
    { key: "documents", label: "Documents", value: String(documents.length), sublabel: pct(documents.length), icon: FileText, color: "fuchsia" },
    { key: "storage", label: "Storage Used", value: formatFileSize(totalBytes), icon: HardDrive, color: "pink" },
  ];
}
