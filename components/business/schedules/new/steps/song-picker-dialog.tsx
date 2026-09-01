"use client";

import * as React from "react";
import { Check, Music } from "lucide-react";

import { MOCK_SONG_LIBRARY, type ScheduleSong } from "../wizard-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { VioletButton } from "@/components/business/branches/new/violet-button";

export function SongPickerDialog({
  open,
  onOpenChange,
  alreadyAddedIds,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alreadyAddedIds: string[];
  onAdd: (songs: ScheduleSong[]) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [picked, setPicked] = React.useState<string[]>([]);

  const q = query.trim().toLowerCase();
  const songs = MOCK_SONG_LIBRARY.filter(
    (s) => !q || s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q) || s.genre.toLowerCase().includes(q),
  );

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  function handleAdd() {
    onAdd(MOCK_SONG_LIBRARY.filter((s) => picked.includes(s.id)));
    setPicked([]);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Songs</DialogTitle>
          <DialogDescription>Search by title, artist or genre.</DialogDescription>
        </DialogHeader>

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search songs..."
          className="h-9 text-sm"
        />

        <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
          {songs.map((song) => {
            const already = alreadyAddedIds.includes(song.id);
            const selected = picked.includes(song.id);
            return (
              <button
                key={song.id}
                type="button"
                disabled={already}
                onClick={() => toggle(song.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg border p-2 text-left transition-colors",
                  already ? "cursor-not-allowed border-transparent opacity-40" : selected ? "border-violet-500 bg-violet-500/10" : "border-transparent hover:bg-muted/40",
                )}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <Music className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{song.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{song.artist} · {song.genre}</span>
                </span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{song.duration}</span>
                {selected && (
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-violet-600 text-white">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
          {songs.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No songs match your search.</p>
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <VioletButton type="button" onClick={handleAdd} disabled={picked.length === 0}>
            Add {picked.length > 0 ? picked.length : ""} Song{picked.length === 1 ? "" : "s"}
          </VioletButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
