import Image from "next/image";
import { FileImage, FileText, Music, Video } from "lucide-react";

import type { ContentItem } from "@/lib/business/content-queries";
import { formatDuration } from "@/lib/business/content-format";
import { cn } from "@/lib/utils";

const TYPE_ICON = { video: Video, image: FileImage, audio: Music, document: FileText } as const;
const STATUS_STYLE = {
  approved: "bg-emerald-500/90 text-white",
  pending: "bg-amber-500/90 text-white",
  rejected: "bg-rose-500/90 text-white",
} as const;

export function CreativeGrid({
  creatives,
  onSelect,
}: {
  creatives: ContentItem[];
  onSelect: (c: ContentItem) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {creatives.map((c) => {
        const Icon = TYPE_ICON[c.contentType];
        return (
          <div
            key={c.id}
            role="button"
            tabIndex={0}
            aria-label={`View ${c.title} details`}
            onClick={() => onSelect(c)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(c);
              }
            }}
            className="cursor-pointer overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-violet-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="relative aspect-video bg-muted">
              {c.previewUrl ? (
                <Image src={c.previewUrl} alt="" fill sizes="260px" className="object-cover" unoptimized />
              ) : (
                <div className="grid h-full place-items-center bg-linear-to-br from-violet-500/20 to-fuchsia-500/20">
                  <Icon className="size-7 text-foreground/40" />
                </div>
              )}
              <span
                className={cn(
                  "absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                  STATUS_STYLE[c.status],
                )}
              >
                {c.status}
              </span>
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-medium text-foreground">{c.title}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {c.contentType} {c.durationSeconds != null && `· ${formatDuration(c.durationSeconds)}`}
              </p>
            </div>
          </div>
        );
      })}
      {creatives.length === 0 && (
        <p className="col-span-full py-10 text-center text-sm text-muted-foreground">No creatives in this view.</p>
      )}
    </div>
  );
}
