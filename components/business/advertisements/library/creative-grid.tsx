import Image from "next/image";
import { FileImage, Music, Video } from "lucide-react";

import { creativeUsageCount, type Creative } from "../mock-data";

const TYPE_ICON = { Video, Image: FileImage, Audio: Music } as const;

export function CreativeGrid({ creatives, onSelect }: { creatives: Creative[]; onSelect: (c: Creative) => void }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {creatives.map((c) => {
        const Icon = TYPE_ICON[c.format];
        const usage = creativeUsageCount(c.id);
        return (
          <div
            key={c.id}
            role="button"
            tabIndex={0}
            aria-label={`View ${c.name} details`}
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
              {c.thumbnail ? (
                <Image src={c.thumbnail} alt="" fill sizes="260px" className="object-cover" unoptimized />
              ) : (
                <div className="grid h-full place-items-center bg-linear-to-br from-violet-500/20 to-fuchsia-500/20">
                  <Icon className="size-7 text-foreground/40" />
                </div>
              )}
              {c.archived && <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">Archived</span>}
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
              <p className="text-xs text-muted-foreground">
                {c.format} {c.durationLabel && `· ${c.durationLabel}`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Used in {usage} campaign{usage === 1 ? "" : "s"}</p>
            </div>
          </div>
        );
      })}
      {creatives.length === 0 && <p className="col-span-full py-10 text-center text-sm text-muted-foreground">No creatives in this view.</p>}
    </div>
  );
}
