"use client";

import * as React from "react";
import Image from "next/image";
import { Check, FileImage, FileText, Music, Video } from "lucide-react";

import type { ContentItem } from "@/lib/business/content-queries";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { VioletButton } from "@/components/business/branches/new/violet-button";

const TYPE_ICON = { video: Video, image: FileImage, audio: Music, document: FileText } as const;
const STATUS_STYLE = {
  approved: "bg-emerald-500/90 text-white",
  pending: "bg-amber-500/90 text-white",
  rejected: "bg-rose-500/90 text-white",
} as const;

export function CreativePickerDialog({
  open,
  onOpenChange,
  creatives,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatives: ContentItem[];
  onPick: (creativeId: string) => void;
}) {
  const [selected, setSelected] = React.useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose from Ad Library</DialogTitle>
          <DialogDescription>
            Pick an existing creative for this campaign. A creative must be approved before it
            will actually play — you can still pick a pending one now and it&apos;ll start once
            approved.
          </DialogDescription>
        </DialogHeader>

        {creatives.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Your Ad Library is empty — upload a creative instead.
          </p>
        ) : (
          <div className="grid max-h-80 grid-cols-2 gap-2.5 overflow-y-auto sm:grid-cols-3">
            {creatives.map((c) => {
              const Icon = TYPE_ICON[c.contentType];
              const isSelected = selected === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelected(c.id)}
                  className={cn(
                    "relative overflow-hidden rounded-xl border text-left transition-colors",
                    isSelected ? "border-violet-500 bg-violet-500/10" : "border-border hover:bg-muted/40",
                  )}
                >
                  <div className="relative aspect-video bg-muted">
                    {c.previewUrl ? (
                      <Image src={c.previewUrl} alt="" fill sizes="150px" className="object-cover" unoptimized />
                    ) : (
                      <div className="grid h-full place-items-center bg-linear-to-br from-violet-500/20 to-fuchsia-500/20">
                        <Icon className="size-6 text-foreground/40" />
                      </div>
                    )}
                    <span
                      className={cn(
                        "absolute top-1.5 left-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium capitalize",
                        STATUS_STYLE[c.status],
                      )}
                    >
                      {c.status}
                    </span>
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-violet-600 text-white">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="truncate text-xs font-medium text-foreground">{c.title}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{c.contentType}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <VioletButton
            type="button"
            disabled={!selected}
            onClick={() => {
              if (selected) onPick(selected);
              onOpenChange(false);
            }}
          >
            Use Creative
          </VioletButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
