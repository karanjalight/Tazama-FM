import type * as React from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Archive, Copy, FileImage, Music, Pencil, Play, Video } from "lucide-react";

import { creativeUsageCount, type Creative } from "../mock-data";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const TYPE_ICON = { Video, Image: FileImage, Audio: Music } as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border py-4 first:border-t-0">
      <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      {children}
    </div>
  );
}

export function CreativeDetailDrawer({
  creative,
  onOpenChange,
  onDuplicate,
  onArchive,
}: {
  creative: Creative | null;
  onOpenChange: (open: boolean) => void;
  onDuplicate: (c: Creative) => void;
  onArchive: (id: string) => void;
}) {
  const Icon = creative ? TYPE_ICON[creative.format] : Video;

  return (
    <Sheet open={!!creative} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        {creative && (
          <>
            <SheetHeader>
              <SheetTitle>{creative.name}</SheetTitle>
              <SheetDescription className="sr-only">Creative details</SheetDescription>
            </SheetHeader>

            <div className="px-4">
              <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
                {creative.thumbnail ? (
                  <Image src={creative.thumbnail} alt="" fill sizes="400px" className="object-cover" unoptimized />
                ) : (
                  <div className="grid h-full place-items-center bg-linear-to-br from-violet-500/20 to-fuchsia-500/20">
                    <Icon className="size-8 text-foreground/40" />
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {creative.format} {creative.durationLabel && `· ${creative.durationLabel}`}
              </p>

              <Section title="Used in">
                <p className="text-sm text-foreground">
                  {creativeUsageCount(creative.id)} campaign{creativeUsageCount(creative.id) === 1 ? "" : "s"}
                </p>
              </Section>

              {creative.dimensions && (
                <Section title="Dimensions">
                  <p className="text-sm text-foreground">{creative.dimensions}</p>
                </Section>
              )}

              <Section title="Uploaded">
                <p className="text-sm text-foreground">{creative.uploadedLabel}</p>
              </Section>

              <Section title="Actions">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => toast.info("Preview isn't wired up in this preview yet")} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-input px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                    <Play className="size-3.5" />
                    Preview
                  </button>
                  <button type="button" onClick={() => toast.info("Editing isn't wired up in this preview yet")} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-input px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                    <Pencil className="size-3.5" />
                    Edit
                  </button>
                  <button type="button" onClick={() => onDuplicate(creative)} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-input px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                    <Copy className="size-3.5" />
                    Duplicate
                  </button>
                  <button type="button" onClick={() => onArchive(creative.id)} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-input px-3 py-2 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/10">
                    <Archive className="size-3.5" />
                    {creative.archived ? "Unarchive" : "Archive"}
                  </button>
                </div>
              </Section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
