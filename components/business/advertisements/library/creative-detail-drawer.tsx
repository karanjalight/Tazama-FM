"use client";

import * as React from "react";
import Image from "next/image";
import { Check, Copy, FileImage, FileText, Music, Pencil, Trash2, Video, X } from "lucide-react";

import type { ContentItem } from "@/lib/business/content-queries";
import { formatDuration, formatFileSize } from "@/lib/business/content-format";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const TYPE_ICON = { video: Video, image: FileImage, audio: Music, document: FileText } as const;
const STATUS_STYLE = {
  approved: "text-emerald-400",
  pending: "text-amber-400",
  rejected: "text-rose-400",
} as const;

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
  canModerate,
  onOpenChange,
  onRename,
  onDuplicate,
  onDelete,
  onReview,
}: {
  creative: ContentItem | null;
  canModerate: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: (c: ContentItem, title: string) => void;
  onDuplicate: (c: ContentItem) => void;
  onDelete: (c: ContentItem) => void;
  onReview: (c: ContentItem, status: "approved" | "rejected") => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(creative?.title ?? "");

  // Reset the edit draft whenever a different creative is selected — same
  // convention as RoomDetailPanel/ZoneDetailPanel earlier this session.
  const [lastId, setLastId] = React.useState(creative?.id ?? null);
  if (creative && creative.id !== lastId) {
    setLastId(creative.id);
    setTitle(creative.title);
    setEditing(false);
  }

  const Icon = creative ? TYPE_ICON[creative.contentType] : Video;

  return (
    <Sheet open={!!creative} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        {creative && (
          <>
            <SheetHeader>
              <SheetTitle>{creative.title}</SheetTitle>
              <SheetDescription className="sr-only">Creative details</SheetDescription>
            </SheetHeader>

            <div className="px-4">
              <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
                {creative.contentType === "video" && creative.url ? (
                  <video src={creative.url} controls className="size-full object-contain" />
                ) : creative.contentType === "image" && creative.url ? (
                  <Image src={creative.url} alt="" fill sizes="400px" className="object-cover" unoptimized />
                ) : creative.contentType === "audio" && creative.url ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3">
                    <Icon className="size-8 text-foreground/40" />
                    <audio src={creative.url} controls className="w-4/5" />
                  </div>
                ) : (
                  <div className="grid h-full place-items-center bg-linear-to-br from-violet-500/20 to-fuchsia-500/20">
                    <Icon className="size-8 text-foreground/40" />
                  </div>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                <span className="capitalize text-muted-foreground">
                  {creative.contentType}
                  {creative.durationSeconds != null && ` · ${formatDuration(creative.durationSeconds)}`}
                  {` · ${formatFileSize(creative.sizeBytes)}`}
                </span>
                <span className={cn("shrink-0 text-xs font-medium capitalize", STATUS_STYLE[creative.status])}>
                  {creative.status}
                </span>
              </div>

              <Section title="Name">
                {editing ? (
                  <div className="flex gap-2">
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9" maxLength={120} />
                    <button
                      type="button"
                      onClick={() => {
                        onRename(creative, title.trim() || creative.title);
                        setEditing(false);
                      }}
                      disabled={!title.trim()}
                      className="shrink-0 rounded-lg bg-violet-600 px-3 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-foreground">{creative.title}</p>
                )}
              </Section>

              <Section title="Uploaded">
                <p className="text-sm text-foreground">
                  {new Date(creative.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {creative.uploadedByName && ` · ${creative.uploadedByName}`}
                </p>
              </Section>

              {canModerate && creative.status === "pending" && (
                <Section title="Review">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onReview(creative, "approved")}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 px-3 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10"
                    >
                      <Check className="size-3.5" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => onReview(creative, "rejected")}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 px-3 py-2 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/10"
                    >
                      <X className="size-3.5" />
                      Reject
                    </button>
                  </div>
                </Section>
              )}

              <Section title="Actions">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-input px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <Pencil className="size-3.5" />
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicate(creative)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-input px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <Copy className="size-3.5" />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(creative)}
                    className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 px-3 py-2 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/10"
                  >
                    <Trash2 className="size-3.5" />
                    Delete
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
