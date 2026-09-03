"use client";

import Image from "next/image";
import { FileText, Image as ImageIcon, Music, Video } from "lucide-react";

import type { ContentItem, ContentStatus } from "@/lib/business/content-queries";
import { formatDuration, formatFileSize } from "@/lib/business/content-format";
import { formatRelativeTime, cn } from "@/lib/utils";

const TYPE_ICON = { video: Video, image: ImageIcon, audio: Music, document: FileText } as const;

const FORMAT_BADGE: Record<string, string> = {
  MP4: "bg-blue-500/80 text-white",
  WEBM: "bg-blue-500/80 text-white",
  MOV: "bg-blue-500/80 text-white",
  JPG: "bg-emerald-500/80 text-white",
  JPEG: "bg-emerald-500/80 text-white",
  PNG: "bg-emerald-500/80 text-white",
  WEBP: "bg-emerald-500/80 text-white",
  GIF: "bg-emerald-500/80 text-white",
  MP3: "bg-amber-500/80 text-white",
  M4A: "bg-amber-500/80 text-white",
  WAV: "bg-amber-500/80 text-white",
  OGG: "bg-amber-500/80 text-white",
  PDF: "bg-muted text-muted-foreground",
  DOC: "bg-muted text-muted-foreground",
  DOCX: "bg-muted text-muted-foreground",
  TXT: "bg-muted text-muted-foreground",
};

function StatusDot({ status }: { status: ContentStatus }) {
  const cls =
    status === "approved" ? "bg-emerald-500" : status === "pending" ? "bg-amber-500" : "bg-rose-500";
  const label = status === "approved" ? "Approved" : status === "pending" ? "Pending" : "Rejected";
  const textCls =
    status === "approved" ? "text-emerald-400" : status === "pending" ? "text-amber-400" : "text-rose-400";
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", textCls)}>
      <span className={cn("size-1.5 rounded-full", cls)} />
      {label}
    </span>
  );
}

function Thumbnail({ item, className }: { item: ContentItem; className?: string }) {
  const Icon = TYPE_ICON[item.contentType];
  if (item.previewUrl) {
    return (
      <div className={cn("relative overflow-hidden bg-muted", className)}>
        <Image src={item.previewUrl} alt="" fill sizes="300px" className="object-cover" unoptimized />
      </div>
    );
  }
  return (
    <div className={cn("grid place-items-center bg-linear-to-br from-violet-500/20 to-fuchsia-500/20", className)}>
      <Icon className="size-8 text-foreground/40" />
    </div>
  );
}

/** Thumbnail-forward card used both by the "grid" view (every screen
 * size) and as the mobile fallback for the "list" view (< sm:).
 * `showUploaded` is only turned on for the list-view mobile fallback so
 * the "Uploaded" column the table exposes that the plain grid card
 * doesn't isn't silently dropped there, without changing the grid
 * view's own appearance. */
function ContentCard({
  item,
  selected,
  onSelect,
  showUploaded = false,
}: {
  item: ContentItem;
  selected: boolean;
  onSelect: () => void;
  showUploaded?: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "cursor-pointer overflow-hidden rounded-xl border text-left transition-colors",
        selected ? "border-violet-500/60 bg-violet-500/8" : "border-border hover:bg-muted/30",
      )}
    >
      <div className="relative">
        <Thumbnail item={item} className="aspect-video w-full" />
        {item.format && (
          <span
            className={cn(
              "absolute top-2 left-2 rounded px-1.5 py-0.5 text-[10px] font-semibold",
              FORMAT_BADGE[item.format] ?? "bg-muted text-muted-foreground",
            )}
          >
            {item.format}
          </span>
        )}
        {item.durationSeconds != null && (
          <span className="absolute right-2 bottom-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white">
            {formatDuration(item.durationSeconds)}
          </span>
        )}
      </div>
      <div className="p-2.5">
        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(item.sizeBytes)} {item.resolution && `· ${item.resolution}`}
        </p>
        <div className="mt-1 flex items-center justify-between">
          <StatusDot status={item.status} />
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {item.tag ?? "Untagged"}
          </span>
        </div>
        {showUploaded && (
          <p className="mt-1.5 text-[10px] text-muted-foreground">Uploaded {formatRelativeTime(item.createdAt)}</p>
        )}
      </div>
    </div>
  );
}

export function ContentGrid({
  view,
  items,
  selectedId,
  onSelect,
}: {
  view: "grid" | "list";
  items: ContentItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (view === "list") {
    return (
      <>
        {/* Table on sm: and up; a 2-up thumbnail-card fallback below sm:
            (the same extracted ContentCard the grid view uses, with the
            "Uploaded" field the table exposes that the plain card
            doesn't switched on) so mobile never needs horizontal
            scrolling to read the rest of a row. */}
        <div className="hidden sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2.5 font-medium">Name</th>
                <th className="px-3 py-2.5 font-medium">Type</th>
                <th className="px-3 py-2.5 font-medium">Size</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Tag</th>
                <th className="px-3 py-2.5 font-medium">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const selected = item.id === selectedId;
                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelect(item.id)}
                    className={cn(
                      "cursor-pointer border-t border-border transition-colors",
                      selected ? "bg-violet-500/8" : "hover:bg-muted/40",
                    )}
                    style={selected ? { boxShadow: "inset 2px 0 0 0 var(--color-violet-500)" } : undefined}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Thumbnail item={item} className="size-9 shrink-0 rounded-lg" />
                        <p className="truncate font-medium text-foreground">{item.title}</p>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{item.format ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{formatFileSize(item.sizeBytes)}</td>
                    <td className="px-3 py-2.5">
                      <StatusDot status={item.status} />
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{item.tag ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{formatRelativeTime(item.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-2 gap-4 p-4 sm:hidden">
          {items.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              onSelect={() => onSelect(item.id)}
              showUploaded
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => (
        <ContentCard
          key={item.id}
          item={item}
          selected={item.id === selectedId}
          onSelect={() => onSelect(item.id)}
        />
      ))}
    </div>
  );
}
