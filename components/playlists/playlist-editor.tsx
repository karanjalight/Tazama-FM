"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GripVertical,
  Loader2,
  Pause,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Cover } from "@/components/cover";
import { Button } from "@/components/ui/button";
import { usePlayer } from "@/components/player/player-provider";
import { addToQueue } from "@/app/rooms/actions";
import { cn } from "@/lib/utils";
import { ytThumb } from "@/lib/playlists/types";
import type { UserPlaylist, UserPlaylistTrack } from "@/lib/playlists/types";
import {
  addPlaylistTracks,
  deletePlaylist as deletePlaylistAction,
  removePlaylistTrack,
  renamePlaylist as renamePlaylistAction,
  reorderPlaylistTracks,
} from "@/app/dashboard/playlists/actions";

interface SearchHit {
  youtubeId: string;
  title: string;
  artist: string | null;
  thumbnailUrl: string | null;
}

/** Edit a user-saved playlist: reorder (drag), remove, rename, delete, add, play. */
export function PlaylistEditor({
  playlist,
  roomId,
}: {
  playlist: UserPlaylist;
  roomId: string | null;
}) {
  const router = useRouter();
  const { play, currentTrack, isPlaying, togglePlay } = usePlayer();

  const [tracks, setTracks] = useState<UserPlaylistTrack[]>(playlist.tracks);
  const [name, setName] = useState(playlist.name);
  const [editingName, setEditingName] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busyAll, setBusyAll] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function toPlayerTrack(t: UserPlaylistTrack) {
    return {
      id: t.id,
      youtubeId: t.videoId,
      title: t.title,
      artist: t.artist,
      thumbnailUrl: ytThumb(t.videoId),
    };
  }

  function playFrom(index: number) {
    if (!tracks.length) return;
    const list = tracks.map(toPlayerTrack);
    play(list[index], list);
  }

  async function addTrackToRoom(t: UserPlaylistTrack) {
    if (!roomId) return;
    const res = await addToQueue(roomId, {
      youtubeId: t.videoId,
      title: t.title,
      artist: t.artist,
      thumbnailUrl: ytThumb(t.videoId),
    });
    if (res.ok) toast.success(`Added “${t.title}” to the room`);
    else toast.error("Couldn’t add to the room queue.");
  }

  async function playAll() {
    if (!tracks.length) return;
    if (roomId) {
      if (busyAll) return;
      setBusyAll(true);
      let ok = 0;
      for (const t of tracks) {
        const res = await addToQueue(roomId, {
          youtubeId: t.videoId,
          title: t.title,
          artist: t.artist,
          thumbnailUrl: ytThumb(t.videoId),
        });
        if (res.ok) ok += 1;
      }
      setBusyAll(false);
      toast.success(`Added ${ok} ${ok === 1 ? "track" : "tracks"} to the room`);
    } else {
      playFrom(0);
    }
  }

  function onDrop(targetIndex: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    setOverIndex(null);
    if (from === null || from === targetIndex) return;
    const next = [...tracks];
    const [moved] = next.splice(from, 1);
    next.splice(targetIndex, 0, moved);
    setTracks(next);
    void reorderPlaylistTracks(
      playlist.id,
      next.map((t) => t.id),
    ).then((r) => {
      if (!r.ok) toast.error("Couldn’t save the new order.");
    });
  }

  async function remove(trackId: string) {
    const prev = tracks;
    setTracks((ts) => ts.filter((t) => t.id !== trackId));
    const res = await removePlaylistTrack(playlist.id, trackId);
    if (!res.ok) {
      setTracks(prev);
      toast.error("Couldn’t remove that track.");
    }
  }

  async function saveName() {
    setEditingName(false);
    const trimmed = name.trim();
    if (!trimmed || trimmed === playlist.name) {
      setName(trimmed || playlist.name);
      return;
    }
    const res = await renamePlaylistAction(playlist.id, trimmed);
    if (!res.ok) toast.error("Couldn’t rename the playlist.");
  }

  async function onDelete() {
    if (!confirmDel) {
      setConfirmDel(true);
      return;
    }
    const res = await deletePlaylistAction(playlist.id);
    if (res.ok) {
      toast.success("Playlist deleted");
      router.push("/dashboard/playlists");
      router.refresh();
    } else {
      toast.error("Couldn’t delete the playlist.");
    }
  }

  // ── add tracks via search ────────────────────────────────────────────────
  const [showSearch, setShowSearch] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (query.length < 2 || searching) return;
    setSearching(true);
    try {
      const res = await fetch("/api/rooms/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query }),
      });
      const data = (await res.json()) as { tracks?: SearchHit[] };
      setResults(Array.isArray(data.tracks) ? data.tracks : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function addHit(h: SearchHit) {
    const res = await addPlaylistTracks(playlist.id, [
      { videoId: h.youtubeId, title: h.title, artist: h.artist },
    ]);
    if (res.ok && res.tracks.length) {
      setTracks((ts) => [...ts, ...res.tracks]);
      toast.success(`Added “${h.title}”`);
    } else {
      toast.error("Couldn’t add that track.");
    }
  }

  return (
    <div className="mx-auto  space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <Cover
          title={name}
          src={tracks[0] ? ytThumb(tracks[0].videoId) : undefined}
          sizes="160px"
          className="size-36 shrink-0 rounded-xl sm:size-40"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Playlist
          </p>
          {editingName ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") {
                  setName(playlist.name);
                  setEditingName(false);
                }
              }}
              className="mt-1 w-full bg-transparent font-heading text-3xl font-bold tracking-tight text-foreground outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="mt-1 block max-w-full truncate text-left font-heading text-3xl font-bold tracking-tight text-foreground hover:opacity-80"
              title="Rename"
            >
              {name}
            </button>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            {tracks.length} {tracks.length === 1 ? "song" : "songs"}
            {playlist.mood ? ` · ${playlist.mood}` : ""}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              variant="brand"
              size="pill"
              onClick={playAll}
              disabled={!tracks.length || busyAll}
            >
              {busyAll ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4 fill-current" />
              )}
              {roomId ? "Add all to room" : "Play"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSearch((s) => !s)}
            >
              <Plus className="size-4" /> Add tracks
            </Button>
            <Button
              variant={confirmDel ? "destructive" : "ghost"}
              size="sm"
              onClick={onDelete}
              onMouseLeave={() => setConfirmDel(false)}
            >
              <Trash2 className="size-4" />
              {confirmDel ? "Confirm delete" : "Delete"}
            </Button>
          </div>
        </div>
      </header>

      {/* Add-tracks search */}
      {showSearch && (
        <div className="rounded-xl border border-border bg-card p-3">
          <form onSubmit={runSearch} className="flex items-center gap-2">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search for a song to add…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <Button type="submit" size="sm" disabled={searching}>
              {searching ? <Loader2 className="size-4 animate-spin" /> : "Search"}
            </Button>
          </form>
          {results.length > 0 && (
            <ul className="mt-3 space-y-1">
              {results.map((h) => (
                <li
                  key={h.youtubeId}
                  className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-muted/60"
                >
                  <Cover
                    title={h.title}
                    src={h.thumbnailUrl ?? undefined}
                    sizes="40px"
                    className="size-10 shrink-0 rounded"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{h.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {h.artist ?? "Unknown artist"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => addHit(h)}
                    aria-label={`Add ${h.title}`}
                  >
                    <Plus className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Track list */}
      {tracks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No tracks yet. Add some above, or ask the concierge to build one.
        </p>
      ) : (
        <ul className="space-y-0.5">
          {tracks.map((t, i) => {
            const isCurrent = currentTrack?.id === t.id;
            const playingThis = isCurrent && isPlaying;
            return (
              <li
                key={t.id}
                draggable
                onDragStart={() => (dragIndex.current = i)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverIndex(i);
                }}
                onDrop={() => onDrop(i)}
                onDragEnd={() => {
                  dragIndex.current = null;
                  setOverIndex(null);
                }}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-1 py-1.5 transition-colors hover:bg-muted/60",
                  overIndex === i && "bg-muted",
                )}
              >
                <span className="cursor-grab text-muted-foreground/60 active:cursor-grabbing">
                  <GripVertical className="size-4" />
                </span>
                <button
                  type="button"
                  onClick={() => (isCurrent ? togglePlay() : playFrom(i))}
                  aria-label={playingThis ? "Pause" : `Play ${t.title}`}
                  className="grid size-7 shrink-0 place-items-center text-muted-foreground"
                >
                  {playingThis ? (
                    <Pause className="size-3.5 fill-current text-play" />
                  ) : (
                    <>
                      <span className="text-xs tabular-nums group-hover:hidden">
                        {i + 1}
                      </span>
                      <Play className="hidden size-3.5 translate-x-px fill-current text-foreground group-hover:block" />
                    </>
                  )}
                </button>
                <Cover
                  title={t.title}
                  src={ytThumb(t.videoId)}
                  sizes="40px"
                  className="size-10 shrink-0 rounded"
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-sm font-medium",
                      isCurrent ? "text-play" : "text-foreground",
                    )}
                  >
                    {t.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.artist ?? "Unknown artist"}
                  </p>
                </div>
                {roomId && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => addTrackToRoom(t)}
                    aria-label="Add to room"
                  >
                    <Plus className="size-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(t.id)}
                  aria-label={`Remove ${t.title}`}
                  className="text-muted-foreground opacity-0 transition group-hover:opacity-100"
                >
                  <X className="size-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
