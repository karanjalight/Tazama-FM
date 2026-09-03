"use client";

import * as React from "react";
import Image from "next/image";
import { FileImage, ListMusic, TrendingDown, TrendingUp, Video } from "lucide-react";

import type { ContentPerformanceRow } from "./data-engine";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const TYPE_ICON = { Video, Playlist: ListMusic, Image: FileImage } as const;

export function ContentPerformanceTable({ rows }: { rows: ContentPerformanceRow[] }) {
  const [selected, setSelected] = React.useState<ContentPerformanceRow | null>(null);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Content Performance</h2>

      <div className="mt-3 hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Content</th>
              <th className="px-3 py-2 text-right font-medium">Plays</th>
              <th className="px-3 py-2 text-right font-medium">Reach</th>
              <th className="py-2 pl-3 text-right font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const Icon = TYPE_ICON[row.type];
              const isUp = row.trendPct >= 0;
              const TrendIcon = isUp ? TrendingUp : TrendingDown;
              return (
                <tr
                  key={row.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`View details for ${row.title}`}
                  onClick={() => setSelected(row)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(row);
                    }
                  }}
                  className="cursor-pointer border-b border-border/60 last:border-b-0 hover:bg-muted/40 focus-visible:bg-muted/50 focus-visible:outline-none"
                >
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {row.thumbnail ? (
                          <Image src={row.thumbnail} alt="" fill sizes="36px" className="object-cover" unoptimized />
                        ) : (
                          <div className="grid h-full place-items-center text-muted-foreground">
                            <Icon className="size-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{row.title}</p>
                        <p className="text-xs text-muted-foreground">{row.type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-foreground">{row.plays.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{row.reach.toLocaleString()}</td>
                  <td className="py-2.5 pl-3 text-right">
                    <span className={cn("inline-flex items-center gap-1 font-medium", isUp ? "text-emerald-400" : "text-rose-400")}>
                      <TrendIcon className="size-3.5" aria-hidden="true" />
                      {isUp ? "+" : ""}
                      {row.trendPct}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Stacked cards — below sm */}
      <div className="mt-3 space-y-3 sm:hidden">
        {rows.map((row) => {
          const Icon = TYPE_ICON[row.type];
          const isUp = row.trendPct >= 0;
          const TrendIcon = isUp ? TrendingUp : TrendingDown;
          return (
            <div
              key={row.id}
              role="button"
              tabIndex={0}
              aria-label={`View details for ${row.title}`}
              onClick={() => setSelected(row)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected(row);
                }
              }}
              className="cursor-pointer rounded-xl border border-border/60 p-3 transition-colors hover:bg-muted/40 focus-visible:bg-muted/50 focus-visible:outline-none"
            >
              <div className="flex items-center gap-2.5">
                <div className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {row.thumbnail ? (
                    <Image src={row.thumbnail} alt="" fill sizes="36px" className="object-cover" unoptimized />
                  ) : (
                    <div className="grid h-full place-items-center text-muted-foreground">
                      <Icon className="size-4" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{row.title}</p>
                  <p className="text-xs text-muted-foreground">{row.type}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Plays</p>
                  <p className="font-mono text-foreground">{row.plays.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reach</p>
                  <p className="font-mono text-foreground">{row.reach.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Trend</p>
                  <span className={cn("inline-flex items-center gap-1 font-mono font-medium", isUp ? "text-emerald-400" : "text-rose-400")}>
                    <TrendIcon className="size-3.5" aria-hidden="true" />
                    {isUp ? "+" : ""}
                    {row.trendPct}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
                <SheetDescription>{selected.type} · Content performance detail</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-4">
                {selected.thumbnail && (
                  <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
                    <Image src={selected.thumbnail} alt="" fill sizes="400px" className="object-cover" unoptimized />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-muted-foreground">Plays</p>
                    <p className="font-mono text-lg font-semibold text-foreground">{selected.plays.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-muted-foreground">Estimated reach</p>
                    <p className="font-mono text-lg font-semibold text-foreground">{selected.reach.toLocaleString()}</p>
                  </div>
                </div>
                <p className={cn("text-sm font-medium", selected.trendPct >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {selected.trendPct >= 0 ? "+" : ""}
                  {selected.trendPct}% vs previous period
                </p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
