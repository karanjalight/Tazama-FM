"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Radio, Users, Wifi } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CreateBranchDialog } from "@/components/business/create-branch-dialog";
import { Cover } from "@/components/cover";
import { cn } from "@/lib/utils";
import type { BranchCardSummary } from "@/lib/business/types";

export function BranchList({
  summaries,
  canCreate,
}: {
  summaries: BranchCardSummary[];
  canCreate: boolean;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <div className="space-y-6">
      {canCreate && (
        <>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            Add branch
          </Button>
          <CreateBranchDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        </>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {summaries.map((s) => (
          <Link
            key={s.branch.id}
            href={`/business/branches/${s.branch.id}`}
            className="overflow-hidden rounded-2xl border border-border bg-card hover:border-foreground/20"
          >
            <div className="relative flex aspect-video items-center justify-center bg-ink">
              {s.nowPlaying?.thumbnailUrl ? (
                <Cover
                  src={s.nowPlaying.thumbnailUrl}
                  title={s.nowPlaying.title}
                  className="size-16"
                  sizes="64px"
                />
              ) : (
                <Radio className="size-8 text-white/40" />
              )}
              {s.isPlaying && (
                <span className="absolute top-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
                  On air
                </span>
              )}
            </div>
            <div className="p-4">
              <p className="font-medium text-foreground">{s.branch.name}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {s.nowPlaying
                  ? `${s.nowPlaying.title}${s.nowPlaying.artist ? ` — ${s.nowPlaying.artist}` : ""}`
                  : "Nothing playing"}
              </p>
              <div className="mt-2.5 flex items-center gap-3 text-xs text-muted-foreground">
                <span
                  className={cn(
                    "inline-flex items-center gap-1",
                    s.onlineDeviceCount > 0 && "text-emerald-600",
                  )}
                >
                  <Wifi className="size-3.5" />
                  {s.onlineDeviceCount}/{s.devices.length} devices
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" />
                  {s.liveVisitorCount} live
                </span>
              </div>
              {s.lastSeenAt && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Last seen {new Date(s.lastSeenAt).toLocaleString()}
                </p>
              )}
            </div>
          </Link>
        ))}
        {!summaries.length && (
          <p className="text-sm text-muted-foreground">
            No branches yet — add your first one above.
          </p>
        )}
      </div>
    </div>
  );
}
