"use client";

import * as React from "react";
import Image from "next/image";
import { Check, FileText, Image as ImageIcon, Video } from "lucide-react";

import type { ContentItem } from "@/lib/business/content-queries";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { VioletButton } from "@/components/business/branches/new/violet-button";

const TYPE_ICON = { video: Video, image: ImageIcon, audio: Video, document: FileText } as const;

/** Shared picker for both "Browse Content Library" (Option A) and "Add ads
 * from Content Library" (Option C's ad layer) — same real business content,
 * scoped by `purpose` at the call site (content vs. ad_creative). */
export function ContentLibraryPickerDialog({
  open,
  onOpenChange,
  items,
  alreadySelectedIds,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ContentItem[];
  alreadySelectedIds: string[];
  onAdd: (items: ContentItem[]) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [picked, setPicked] = React.useState<string[]>([]);

  const q = query.trim().toLowerCase();
  const filtered = items.filter((c) => !q || c.title.toLowerCase().includes(q));

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  function handleAdd() {
    const chosen = items.filter((c) => picked.includes(c.id));
    onAdd(chosen);
    setPicked([]);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Browse Content Library</DialogTitle>
          <DialogDescription>Pick one or more items to add to this schedule.</DialogDescription>
        </DialogHeader>

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search content..."
          className="h-9 text-sm"
        />

        <div className="mt-3 grid max-h-80 grid-cols-2 gap-2.5 overflow-y-auto sm:grid-cols-3">
          {filtered.map((item) => {
            const Icon = TYPE_ICON[item.contentType];
            const already = alreadySelectedIds.includes(item.id);
            const selected = picked.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                disabled={already}
                onClick={() => toggle(item.id)}
                className={cn(
                  "relative overflow-hidden rounded-xl border text-left transition-colors",
                  already ? "cursor-not-allowed border-border opacity-40" : selected ? "border-violet-500 bg-violet-500/10" : "border-border hover:bg-muted/40",
                )}
              >
                <div className="relative aspect-video bg-muted">
                  {item.previewUrl ? (
                    <Image src={item.previewUrl} alt="" fill sizes="150px" className="object-cover" unoptimized />
                  ) : (
                    <div className="grid h-full place-items-center bg-linear-to-br from-violet-500/20 to-fuchsia-500/20">
                      <Icon className="size-6 text-foreground/40" />
                    </div>
                  )}
                  {selected && (
                    <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-violet-600 text-white">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  )}
                </div>
                <div className="p-2">
                  <p className="truncate text-xs font-medium text-foreground">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {item.contentType} {item.durationSeconds ? `· ${Math.round(item.durationSeconds)}s` : ""}
                  </p>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
              {items.length === 0 ? "Your Content Library is empty." : "No content matches your search."}
            </p>
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <VioletButton type="button" onClick={handleAdd} disabled={picked.length === 0}>
            Add {picked.length > 0 ? picked.length : ""} Item{picked.length === 1 ? "" : "s"}
          </VioletButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
