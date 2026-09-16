"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Library, Plus } from "lucide-react";

import type { ContentItem } from "@/lib/business/content-queries";
import { duplicateAdCreative } from "@/app/business/advertisements/actions";
import { updateContentItem, deleteContentItem } from "@/app/business/content/actions";
import { CreativeGrid } from "./creative-grid";
import { CreativeDetailDrawer } from "./creative-detail-drawer";
import { UploadCreativeDialog } from "./upload-creative-dialog";
import { AnalyticsEmptyState } from "@/components/business/analytics/empty-state";
import { VioletButton } from "@/components/business/branches/new/violet-button";
import { cn } from "@/lib/utils";

const TABS = ["All", "Videos", "Images", "Audio"] as const;

export function AdLibraryWorkspace({
  businessId,
  items,
  canModerate,
}: {
  businessId: string;
  items: ContentItem[];
  canModerate: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<(typeof TABS)[number]>("All");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = React.useState(false);

  const selected = items.find((c) => c.id === selectedId) ?? null;
  const filtered = items.filter((c) => {
    if (tab === "All") return true;
    if (tab === "Videos") return c.contentType === "video";
    if (tab === "Images") return c.contentType === "image";
    if (tab === "Audio") return c.contentType === "audio";
    return true;
  });

  async function handleRename(item: ContentItem, title: string) {
    const res = await updateContentItem({ businessId, id: item.id, title });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Creative renamed.");
    router.refresh();
  }

  async function handleDuplicate(item: ContentItem) {
    const res = await duplicateAdCreative({ businessId, id: item.id });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Duplicated "${item.title}".`);
    setSelectedId(null);
    router.refresh();
  }

  async function handleDelete(item: ContentItem) {
    if (!confirm(`Delete "${item.title}"? This can't be undone.`)) return;
    const res = await deleteContentItem({ businessId, id: item.id });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Creative deleted.");
    setSelectedId(null);
    router.refresh();
  }

  async function handleReview(item: ContentItem, status: "approved" | "rejected") {
    const res = await updateContentItem({ businessId, id: item.id, status });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(status === "approved" ? "Creative approved." : "Creative rejected.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Ad Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your advertising creatives. Only approved creatives can be used in a campaign.
          </p>
        </div>
        <VioletButton type="button" onClick={() => setUploadOpen(true)}>
          <Plus className="size-4" />
          Upload Creative
        </VioletButton>
      </header>

      <div
        role="tablist"
        aria-label="Creative format"
        className="flex flex-wrap gap-1 rounded-xl border border-border bg-muted/30 p-1"
      >
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              tab === t ? "bg-violet-600 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <AnalyticsEmptyState
          icon={Library}
          title="Your ad library is empty"
          description="Upload your first creative."
          ctaLabel="Upload Creative"
          onCta={() => setUploadOpen(true)}
        />
      ) : (
        <CreativeGrid creatives={filtered} onSelect={(c) => setSelectedId(c.id)} />
      )}

      <CreativeDetailDrawer
        creative={selected}
        canModerate={canModerate}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onRename={handleRename}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onReview={handleReview}
      />
      <UploadCreativeDialog open={uploadOpen} onOpenChange={setUploadOpen} onUploaded={() => router.refresh()} />
    </div>
  );
}
