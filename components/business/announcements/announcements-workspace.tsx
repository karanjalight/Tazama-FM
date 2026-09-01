"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Zap } from "lucide-react";

import { namesFor, type Announcement, type AnnouncementTargetOptions } from "./mock-data";
import { AnnouncementsToolbar, DEFAULT_FILTERS, type AnnouncementFilters } from "./announcements-toolbar";
import { AnnouncementsTable } from "./announcements-table";
import { AnnouncementDetailDrawer } from "./announcement-detail-drawer";
import { CreateAnnouncementDialog, draftFromAnnouncement } from "./new/create-announcement-dialog";
import { QuickAnnouncementDialog } from "./new/quick-announcement-dialog";
import type { AnnouncementDraft } from "./new/announcement-draft";
import { deleteAnnouncement, duplicateAnnouncement } from "@/app/business/announcements/actions";

function matchesFilters(a: Announcement, filters: AnnouncementFilters, targetOptions: AnnouncementTargetOptions): boolean {
  const q = filters.query.trim().toLowerCase();
  if (q && !a.title.toLowerCase().includes(q) && !a.description.toLowerCase().includes(q)) return false;
  if (filters.category !== "All Types" && a.category !== filters.category) return false;
  if (filters.status !== "All Status" && a.status !== filters.status.toLowerCase()) return false;
  if (filters.playback !== "All Playback Modes") {
    const wantsPause = filters.playback === "Pause Music";
    if (wantsPause !== (a.playbackMode === "pause")) return false;
  }
  if (filters.location !== "All Locations") {
    const locationNames = namesFor(a.target.locationIds, targetOptions.locations);
    if (!locationNames.includes(filters.location)) return false;
  }
  return true;
}

export function AnnouncementsWorkspace({
  businessId,
  announcements,
  targetOptions,
}: {
  businessId: string;
  announcements: Announcement[];
  targetOptions: AnnouncementTargetOptions;
}) {
  const router = useRouter();
  const [filters, setFilters] = React.useState<AnnouncementFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [quickOpen, setQuickOpen] = React.useState(false);
  const [editingDraft, setEditingDraft] = React.useState<AnnouncementDraft | undefined>(undefined);
  const [editingId, setEditingId] = React.useState<string | undefined>(undefined);
  const [dialogKey, setDialogKey] = React.useState(0);

  const filtered = announcements.filter((a) => matchesFilters(a, filters, targetOptions));
  const selected = announcements.find((a) => a.id === selectedId) ?? null;

  async function handleDuplicate(a: Announcement) {
    const result = await duplicateAnnouncement({ businessId, id: a.id });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Duplicated "${a.title}"`);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const result = await deleteAnnouncement({ businessId, id });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSelectedId(null);
    toast.success("Announcement deleted");
    router.refresh();
  }

  function handleEdit(a: Announcement) {
    setSelectedId(null);
    setEditingDraft(draftFromAnnouncement(a));
    setEditingId(a.id);
    setDialogKey((k) => k + 1);
    setCreateOpen(true);
  }

  function openCreate() {
    setEditingDraft(undefined);
    setEditingId(undefined);
    setDialogKey((k) => k + 1);
    setCreateOpen(true);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Announcements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Send short voice announcements to your customers across your locations.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setQuickOpen(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-input px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Zap className="size-4" />
            Quick Announcement
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-500"
          >
            <Plus className="size-4" />
            New Announcement
          </button>
        </div>
      </header>

      <div className="rounded-2xl border border-border bg-card">
        <AnnouncementsToolbar
          filters={filters}
          locationOptions={targetOptions.locations}
          onChange={(p) => setFilters((f) => ({ ...f, ...p }))}
        />
        <div className="border-t border-border">
          <AnnouncementsTable
            announcements={filtered}
            targetOptions={targetOptions}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
        <div className="px-4 py-3 text-xs text-muted-foreground">
          Showing 1 to {filtered.length} of {filtered.length} announcements
        </div>
      </div>

      <AnnouncementDetailDrawer
        announcement={selected}
        targetOptions={targetOptions}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />

      <CreateAnnouncementDialog
        key={dialogKey}
        open={createOpen}
        onOpenChange={setCreateOpen}
        targetOptions={targetOptions}
        initialDraft={editingDraft}
        editingId={editingId}
      />
      <QuickAnnouncementDialog open={quickOpen} onOpenChange={setQuickOpen} targetOptions={targetOptions} />
    </div>
  );
}
