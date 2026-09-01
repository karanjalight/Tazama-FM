"use client";

import * as React from "react";
import { Plus, Search } from "lucide-react";

import type { Playlist } from "@/lib/business/content-queries";
import { PlaylistGrid } from "./playlist-grid";
import { PlaylistDetailPanel } from "./playlist-detail-panel";
import { CreatePlaylistDialog } from "./create-playlist-dialog";
import { Input } from "@/components/ui/input";

export function PlaylistsWorkspace({
  businessId,
  playlists,
}: {
  businessId: string;
  playlists: Playlist[];
}) {
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(playlists[0]?.id ?? null);
  const [createOpen, setCreateOpen] = React.useState(false);

  const q = query.trim().toLowerCase();
  const filtered = playlists.filter((p) => {
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q);
  });
  const selected = playlists.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Playlists</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build and manage the music playlists available to your screens and audio zones.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-500"
        >
          <Plus className="size-4" />
          New Playlist
        </button>
      </header>

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-2 p-4">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search playlists..."
                  className="h-9 min-w-40 rounded-lg pl-9 text-sm"
                />
              </div>
            </div>

            <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
              {filtered.length} playlist{filtered.length === 1 ? "" : "s"}
            </div>

            <div className="overflow-x-auto">
              <PlaylistGrid playlists={filtered} selectedId={selectedId} onSelect={setSelectedId} />
              {filtered.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No playlists match your search.
                </p>
              )}
            </div>
          </div>
        </div>

        <div>
          {selected ? (
            <PlaylistDetailPanel
              key={selected.id}
              playlist={selected}
              businessId={businessId}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <div className="grid place-items-center rounded-2xl border border-dashed border-border p-10 text-center">
              <p className="text-sm text-muted-foreground">Select a playlist to see its details.</p>
            </div>
          )}
        </div>
      </div>

      <CreatePlaylistDialog open={createOpen} onOpenChange={setCreateOpen} businessId={businessId} />
    </div>
  );
}
