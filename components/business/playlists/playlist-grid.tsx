"use client";

import Image from "next/image";
import { ListMusic } from "lucide-react";

import type { Playlist } from "@/lib/business/content-queries";
import { cn } from "@/lib/utils";

export function PlaylistGrid({
  playlists,
  selectedId,
  onSelect,
}: {
  playlists: Playlist[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 xl:grid-cols-4">
      {playlists.map((playlist) => {
        const selected = playlist.id === selectedId;
        return (
          <div
            key={playlist.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(playlist.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(playlist.id);
              }
            }}
            className={cn(
              "cursor-pointer overflow-hidden rounded-xl border text-left transition-colors",
              selected ? "border-violet-500/60 bg-violet-500/8" : "border-border hover:bg-muted/30",
            )}
          >
            <div className="relative aspect-square bg-muted">
              {playlist.coverUrl ? (
                <Image src={playlist.coverUrl} alt="" fill sizes="220px" className="object-cover" unoptimized />
              ) : (
                <div className="grid h-full place-items-center bg-linear-to-br from-violet-500/20 to-fuchsia-500/20">
                  <ListMusic className="size-8 text-foreground/40" />
                </div>
              )}
              <span className="absolute top-2 left-2 grid size-7 place-items-center rounded-full bg-black/60 text-white">
                <ListMusic className="size-3.5" />
              </span>
              <span
                className={cn(
                  "absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-medium",
                  playlist.status === "active" ? "bg-emerald-500/80 text-white" : "bg-muted/90 text-muted-foreground",
                )}
              >
                {playlist.status === "active" ? "Active" : "Draft"}
              </span>
            </div>
            <div className="p-2.5">
              <p className="truncate text-sm font-medium text-foreground">{playlist.name}</p>
              <p className="truncate text-xs text-muted-foreground">{playlist.tracks.length} tracks</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
