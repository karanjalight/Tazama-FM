"use client";

import * as React from "react";
import { toast } from "sonner";
import { ListMusic, ListPlus, Music, Plus, Sparkles, Trash2 } from "lucide-react";

import { FEATURED_GENRES, searchGenres, genreLabel } from "@/lib/genres";
import type { SessionSong } from "../schedule-state";
import { SongPickerDialog } from "./song-picker-dialog";
import { PlaylistSourcePickerDialog } from "./playlist-source-picker-dialog";
import { generateScheduleGenreTracks } from "@/app/business/schedules/actions";
import { formatDurationSeconds } from "@/lib/business/schedule-duration";
import type { Playlist } from "@/lib/business/content-queries";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useDialogTrigger } from "@/components/business/branches/new/use-dialog-trigger";

const AI_SONGS_PER_GENERATION = 6;

export function PlaylistBuilder({
  genres,
  songs,
  onChange,
  businessPlaylists,
}: {
  genres: string[];
  songs: SessionSong[];
  onChange: (patch: { genres?: string[]; songs?: SessionSong[] }) => void;
  businessPlaylists: Playlist[];
}) {
  const songPicker = useDialogTrigger("playlist-songs");
  const playlistPicker = useDialogTrigger("playlist-source");
  const [genreQuery, setGenreQuery] = React.useState("");
  const [generating, setGenerating] = React.useState(false);

  function toggleGenre(genre: string) {
    onChange({ genres: genres.includes(genre) ? genres.filter((g) => g !== genre) : [...genres, genre] });
  }

  async function generateWithAi() {
    setGenerating(true);
    const existingTrackIds = new Set(songs.map((s) => s.trackId));
    const picks = await generateScheduleGenreTracks(genres, AI_SONGS_PER_GENERATION);
    const fresh = picks.filter((t) => !existingTrackIds.has(t.id));
    onChange({ songs: [...songs, ...fresh.map((track) => ({ trackId: track.id, track, source: "genre" as const }))] });
    setGenerating(false);
    if (!fresh.length) {
      toast.error(genres.length ? "No new tracks found for those genres." : "Pick at least one genre first.");
    } else {
      toast.success(`Added ${fresh.length} song${fresh.length === 1 ? "" : "s"}`, {
        description: genres.length > 0 ? `Matched to ${genres.map(genreLabel).join(", ")}` : undefined,
      });
    }
  }

  function addSongs(picked: SessionSong[]) {
    onChange({ songs: [...songs, ...picked] });
  }

  function removeSong(trackId: string) {
    onChange({ songs: songs.filter((s) => s.trackId !== trackId) });
  }

  const totalSeconds = songs.reduce((sum, s) => sum + (s.track.durationSeconds ?? 0), 0);
  const unresolvedCount = songs.filter((s) => s.track.durationSeconds == null).length;
  const genreChips = genreQuery.trim() ? searchGenres(genreQuery, 24) : FEATURED_GENRES;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Genre preference</p>
        <p className="mb-2 text-xs text-muted-foreground">Used to pull real tracks when generating.</p>
        <Input
          value={genreQuery}
          onChange={(e) => setGenreQuery(e.target.value)}
          placeholder="Search genres..."
          className="mb-2 h-8 text-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {genreChips.map((genre) => {
            const selected = genres.includes(genre.value);
            return (
              <button
                key={genre.value}
                type="button"
                onClick={() => toggleGenre(genre.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  selected ? "border-violet-500 bg-violet-500/15 text-violet-300" : "border-input text-muted-foreground hover:bg-muted",
                )}
              >
                {genre.label}
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
          {generating ? "Generating songs…" : "Generate songs"}
        </button>
        <button
          type="button"
          onClick={songPicker.show}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Plus className="size-4" />
          Add individual songs
        </button>
        <button
          type="button"
          onClick={playlistPicker.show}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <ListPlus className="size-4" />
          From a playlist
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Songs</p>
          <span className="text-xs text-muted-foreground">
            {songs.length} song{songs.length === 1 ? "" : "s"} · {formatDurationSeconds(totalSeconds)}
            {unresolvedCount > 0 && ` · ${unresolvedCount} unknown length`}
          </span>
        </div>

        {songs.length > 0 ? (
          <div className="mt-2 overflow-hidden rounded-xl border border-border">
            {songs.map((song, i) => (
              <div
                key={song.trackId}
                className={cn("flex items-center gap-2.5 p-2.5", i > 0 && "border-t border-border")}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <Music className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-foreground">{song.track.title}</span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        song.source === "genre" ? "bg-violet-500/15 text-violet-400" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {song.source === "genre" ? "Generated" : song.source === "playlist" ? "Playlist" : "Search"}
                    </span>
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{song.track.artist ?? "Unknown"}</span>
                </span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {song.track.durationSeconds != null ? formatDurationSeconds(song.track.durationSeconds) : "—"}
                </span>
                <button
                  type="button"
                  aria-label="Remove song"
                  onClick={() => removeSong(song.trackId)}
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
            <p className="text-sm text-muted-foreground">No songs yet — generate, search, or add from a playlist.</p>
          </div>
        )}
      </div>

      <SongPickerDialog
        key={songPicker.dialogKey}
        open={songPicker.open}
        onOpenChange={songPicker.onOpenChange}
        alreadyAddedTrackIds={songs.map((s) => s.track.youtubeId)}
        onAdd={addSongs}
      />
      <PlaylistSourcePickerDialog
        key={playlistPicker.dialogKey}
        open={playlistPicker.open}
        onOpenChange={playlistPicker.onOpenChange}
        playlists={businessPlaylists}
        alreadyAddedTrackIds={songs.map((s) => s.trackId)}
        onAdd={addSongs}
      />
    </div>
  );
}
