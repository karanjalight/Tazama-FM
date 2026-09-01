"use client";

import * as React from "react";
import { toast } from "sonner";
import { Library, Plus } from "lucide-react";

import { CREATIVES, newCreativeId, type Creative } from "../mock-data";
import { CreativeGrid } from "./creative-grid";
import { CreativeDetailDrawer } from "./creative-detail-drawer";
import { UploadCreativeDialog } from "./upload-creative-dialog";
import { AnalyticsEmptyState } from "@/components/business/analytics/empty-state";
import { VioletButton } from "@/components/business/branches/new/violet-button";
import { cn } from "@/lib/utils";

const TABS = ["All", "Videos", "Images", "Audio", "Archived"] as const;

export function AdLibraryWorkspace() {
  const [creatives, setCreatives] = React.useState<Creative[]>(CREATIVES);
  const [tab, setTab] = React.useState<(typeof TABS)[number]>("All");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = React.useState(false);

  const selected = creatives.find((c) => c.id === selectedId) ?? null;
  const filtered = creatives.filter((c) => {
    if (tab === "Archived") return c.archived;
    if (c.archived) return false;
    if (tab === "All") return true;
    if (tab === "Videos") return c.format === "Video";
    if (tab === "Images") return c.format === "Image";
    if (tab === "Audio") return c.format === "Audio";
    return true;
  });

  function handleUploaded(creative: Creative) {
    setCreatives((list) => [creative, ...list]);
    toast.success(`${creative.name} uploaded`);
  }
  function handleDuplicate(c: Creative) {
    setCreatives((list) => [{ ...c, id: newCreativeId(), name: `${c.name} (Copy)` }, ...list]);
    toast.success(`Duplicated "${c.name}"`);
    setSelectedId(null);
  }
  function handleArchiveToggle(id: string) {
    setCreatives((list) => list.map((c) => (c.id === id ? { ...c, archived: !c.archived } : c)));
    setSelectedId(null);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Ad Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your advertising creatives.</p>
        </div>
        <VioletButton type="button" onClick={() => setUploadOpen(true)}>
          <Plus className="size-4" />
          Upload Creative
        </VioletButton>
      </header>

      <div role="tablist" aria-label="Creative format" className="flex flex-wrap gap-1 rounded-xl border border-border bg-muted/30 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn("rounded-lg px-3.5 py-2 text-sm font-medium transition-colors", tab === t ? "bg-violet-600 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
          >
            {t}
          </button>
        ))}
      </div>

      {creatives.length === 0 ? (
        <AnalyticsEmptyState icon={Library} title="Your ad library is empty" description="Upload your first creative." ctaLabel="Upload Creative" onCta={() => setUploadOpen(true)} />
      ) : (
        <CreativeGrid creatives={filtered} onSelect={(c) => setSelectedId(c.id)} />
      )}

      <CreativeDetailDrawer creative={selected} onOpenChange={(open) => !open && setSelectedId(null)} onDuplicate={handleDuplicate} onArchive={handleArchiveToggle} />
      <UploadCreativeDialog open={uploadOpen} onOpenChange={setUploadOpen} onUploaded={handleUploaded} />
    </div>
  );
}
