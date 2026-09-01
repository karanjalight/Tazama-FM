"use client";

import * as React from "react";
import { toast } from "sonner";
import { ListMusic, Music, Plus, Sparkles, Trash2 } from "lucide-react";

import { GENRES, MOCK_SONG_LIBRARY } from "../wizard-data";
import type { SessionSong } from "../schedule-state";
import { SongPickerDialog } from "./song-picker-dialog";
import { sumDurations } from "./duration-utils";
import { cn } from "@/lib/utils";
import { useDialogTrigger } from "@/components/business/branches/new/use-dialog-trigger";

const AI_SONGS_PER_GENERATION = 6;

export function PlaylistBuilder({
  genres,
  songs,
  onChange,
}: {
  genres: string[];
  songs: SessionSong[];
  onChange: (patch: { genres?: string[]; songs?: SessionSong[] }) => void;
}) {
  const songPicker = useDialogTrigger("playlist-songs");
  const [generating, setGenerating] = React.useState(false);

  function toggleGenre(genre: string) {
    onChange({ genres: genres.includes(genre) ? genres.filter((g) => g !== genre) : [...genres, genre] });
  }

  function generateWithAi() {
    setGenerating(true);
    window.setTimeout(() => {
      const pool = genres.length > 0 ? MOCK_SONG_LIBRARY.filter((s) => genres.includes(s.genre)) : MOCK_SONG_LIBRARY;
      const existingIds = new Set(songs.map((s) => s.id));
      const candidates = pool.filter((s) => !existingIds.has(s.id));
      const shuffled = [...candidates].sort(() => Math.random() - 0.5);
      const picks = shuffled.slice(0, AI_SONGS_PER_GENERATION).map((s) => ({ ...s, source: "ai" as const }));
      onChange({ songs: [...songs, ...picks] });
      setGenerating(false);
      toast.success(`Generated ${picks.length} songs`, {
        description: genres.length > 0 ? `Matched to ${genres.join(", ")}` : "Picked from the full catalog",
      });
    }, 900);
  }

  function addManualSongs(picked: (typeof MOCK_SONG_LIBRARY)[number][]) {
    onChange({ songs: [...songs, ...picked.map((s) => ({ ...s, source: "manual" as const }))] });
  }

  function removeSong(id: string) {
    onChange({ songs: songs.filter((s) => s.id !== id) });
  }

  const totalDuration = sumDurations(songs.map((s) => s.duration));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Genre preference</p>
        <p className="mb-2 text-xs text-muted-foreground">Used to match songs when generating with AI.</p>
        <div className="flex flex-wrap gap-1.5">
          {GENRES.map((genre) => {
            const selected = genres.includes(genre);
            return (
              <button
                key={genre}
                type="button"
                onClick={() => toggleGenre(genre)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  selected ? "border-violet-500 bg-violet-500/15 text-violet-300" : "border-input text-muted-foreground hover:bg-muted",
                )}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={generateWithAi}
          disabled={generating}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2.5 text-sm font-medium text-violet-300 transition-colors hover:bg-violet-500/20 disabled:pointer-events-none disabled:opacity-60"
        >
          <Sparkles className="size-4" />
          {generating ? "Generating songs…" : "Generate with AI"}
        </button>
        <button
          type="button"
          onClick={songPicker.show}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Plus className="size-4" />
          Add individual songs
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Songs</p>
          <span className="text-xs text-muted-foreground">
            {songs.length} song{songs.length === 1 ? "" : "s"} · {totalDuration}
          </span>
        </div>

        {songs.length > 0 ? (
          <div className="mt-2 overflow-hidden rounded-xl border border-border">
            {songs.map((song, i) => (
              <div
                key={song.id}
                className={cn("flex items-center gap-2.5 p-2.5", i > 0 && "border-t border-border")}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <Music className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-foreground">{song.title}</span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        song.source === "ai" ? "bg-violet-500/15 text-violet-400" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {song.source === "ai" ? "AI" : "Manual"}
                    </span>
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{song.artist} · {song.genre}</span>
                </span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{song.duration}</span>
                <button
                  type="button"
                  aria-label="Remove song"
                  onClick={() => removeSong(song.id)}
                  className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-input py-8 text-center">
            <ListMusic className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No songs yet — generate with AI or add them individually.</p>
          </div>
        )}
      </div>

      <SongPickerDialog
        key={songPicker.dialogKey}
        open={songPicker.open}
        onOpenChange={songPicker.onOpenChange}
        alreadyAddedIds={songs.map((s) => s.id)}
        onAdd={addManualSongs}
      />
    </div>
  );
}
