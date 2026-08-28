import { Image as ImageIcon, ListMusic, Video } from "lucide-react";

import { MOCK_TOP_CONTENT } from "./mock-data";

const KIND_ICON = { Image: ImageIcon, Video: Video, Playlist: ListMusic } as const;

export function TopContentTable() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Top Performing Content</h2>
        <span className="font-mono text-xs text-muted-foreground">Today</span>
      </div>

      <div className="mt-4 space-y-1">
        {MOCK_TOP_CONTENT.map((item) => {
          const Icon = KIND_ICON[item.kind as keyof typeof KIND_ICON];
          return (
            <div
              key={item.rank}
              className="flex items-center gap-3 rounded-xl px-1.5 py-2"
            >
              <span className="w-4 shrink-0 font-mono text-xs text-muted-foreground">
                {item.rank}
              </span>
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.kind} · {item.duration}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-sm font-semibold text-foreground">{item.plays}</p>
                <p className="text-xs text-emerald-400">{item.engagement}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
