import Image from "next/image";
import { FileImage, Music, Video } from "lucide-react";

import { CREATIVES, type Campaign } from "./mock-data";

const TYPE_ICON = { Video, Image: FileImage, Audio: Music } as const;

export function TopPerformingAds({ campaigns }: { campaigns: Campaign[] }) {
  const ranked = [...campaigns].sort((a, b) => b.plays - a.plays).slice(0, 3);

  return (
    <div className="space-y-1">
      {ranked.map((c, i) => {
        const creative = c.creativeId ? CREATIVES.find((cr) => cr.id === c.creativeId) : null;
        const Icon = creative ? TYPE_ICON[creative.format] : Video;
        return (
          <div key={c.id} className="flex items-center gap-3 rounded-xl px-1.5 py-2">
            <span className="w-5 shrink-0 text-center font-mono text-sm text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
            <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
              {creative?.thumbnail ? (
                <Image src={creative.thumbnail} alt="" fill sizes="44px" className="object-cover" unoptimized />
              ) : (
                <div className="grid h-full place-items-center bg-linear-to-br from-violet-500/20 to-fuchsia-500/20">
                  <Icon className="size-4 text-foreground/40" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.plays.toLocaleString()} plays</p>
            </div>
            <p className="shrink-0 text-sm font-semibold text-emerald-400">{c.completionPct}%</p>
          </div>
        );
      })}
    </div>
  );
}
