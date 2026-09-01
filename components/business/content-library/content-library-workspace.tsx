"use client";

import * as React from "react";
import { LayoutGrid, List, Search } from "lucide-react";

import type { ContentItem, ContentType } from "@/lib/business/content-queries";
import { ContentGrid } from "./content-grid";
import { ContentDetailPanel } from "./content-detail-panel";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const TABS = [
  { id: "all", label: "All Content" },
  { id: "video", label: "Videos" },
  { id: "image", label: "Images" },
  { id: "audio", label: "Audio" },
  { id: "document", label: "Documents" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const STATUS_ITEMS = ["All Status", "Approved", "Pending", "Rejected"] as const;
const PAGE_SIZE = 24;

export function ContentLibraryWorkspace({
  businessId,
  items,
  canModerate,
}: {
  businessId: string;
  items: ContentItem[];
  canModerate: boolean;
}) {
  const [tab, setTab] = React.useState<TabId>("all");
  const [view, setView] = React.useState<"grid" | "list">("grid");
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<(typeof STATUS_ITEMS)[number]>("All Status");
  const [tagFilter, setTagFilter] = React.useState("All Tags");
  const [page, setPage] = React.useState(1);
  const [selectedContentId, setSelectedContentId] = React.useState<string | null>(items[0]?.id ?? null);

  const tagItems = React.useMemo(() => {
    const tags = new Set<string>();
    for (const item of items) if (item.tag) tags.add(item.tag);
    return ["All Tags", ...Array.from(tags).sort()];
  }, [items]);

  const q = query.trim().toLowerCase();

  const filteredContent = items.filter((item) => {
    if (tab !== "all" && item.contentType !== (tab as ContentType)) return false;
    if (statusFilter !== "All Status" && item.status !== statusFilter.toLowerCase()) return false;
    if (tagFilter !== "All Tags" && item.tag !== tagFilter) return false;
    if (q && !item.title.toLowerCase().includes(q) && !(item.tag ?? "").toLowerCase().includes(q)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredContent.length / PAGE_SIZE));
  // Clamped at render time rather than reset via an effect when filters
  // change — this alone guarantees a filter that narrows the result set
  // never leaves `page` pointing past the end (an empty grid).
  const currentPage = Math.min(page, totalPages);
  const contentPageItems = filteredContent.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const selectedContent = items.find((i) => i.id === selectedContentId) ?? null;

  return (
    <div className="grid items-start gap-4 xl:grid-cols-3">
      <div className="xl:col-span-2">
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-4 pt-3">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  tab === t.id
                    ? "border-violet-500 text-violet-400"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 p-4">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search content..."
                className="h-9 min-w-40 rounded-lg pl-9 text-sm"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as (typeof STATUS_ITEMS)[number])}
              items={STATUS_ITEMS}
              className="h-9 w-32 rounded-lg text-sm"
            />
            <Select
              value={tagFilter}
              onValueChange={setTagFilter}
              items={tagItems}
              className="h-9 w-32 rounded-lg text-sm"
            />
            <div className="flex shrink-0 overflow-hidden rounded-lg border border-input">
              <button
                type="button"
                aria-label="Grid view"
                onClick={() => setView("grid")}
                className={cn(
                  "grid size-9 place-items-center transition-colors",
                  view === "grid" ? "bg-violet-600 text-white" : "text-muted-foreground hover:bg-muted",
                )}
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                type="button"
                aria-label="List view"
                onClick={() => setView("list")}
                className={cn(
                  "grid size-9 place-items-center transition-colors",
                  view === "list" ? "bg-violet-600 text-white" : "text-muted-foreground hover:bg-muted",
                )}
              >
                <List className="size-4" />
              </button>
            </div>
          </div>

          <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
            {filteredContent.length} items
          </div>

          <div className="overflow-x-auto">
            <ContentGrid
              view={view}
              items={contentPageItems}
              selectedId={selectedContentId}
              onSelect={setSelectedContentId}
            />
            {contentPageItems.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No content matches your filters.
              </p>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground">
              <span>
                Showing {(currentPage - 1) * PAGE_SIZE + (contentPageItems.length ? 1 : 0)}–
                {(currentPage - 1) * PAGE_SIZE + contentPageItems.length} of {filteredContent.length} items
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="grid size-7 place-items-center rounded-lg border border-input text-muted-foreground disabled:opacity-40"
                >
                  ‹
                </button>
                <span className="grid size-7 place-items-center rounded-lg bg-violet-600 font-medium text-white">
                  {currentPage}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="grid size-7 place-items-center rounded-lg border border-input text-muted-foreground disabled:opacity-40"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        {selectedContent ? (
          <ContentDetailPanel
            key={selectedContent.id}
            item={selectedContent}
            businessId={businessId}
            canModerate={canModerate}
            onClose={() => setSelectedContentId(null)}
          />
        ) : (
          <div className="grid place-items-center rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">Select an item to see its details.</p>
          </div>
        )}
      </div>
    </div>
  );
}
