"use client";

import * as React from "react";
import { toast } from "sonner";
import { ListMusic, ListPlus, Music, Plus, Sparkles, Trash2 } from "lucide-react";

import { genreLabel } from "@/lib/genres";
import type { SessionSong } from "../schedule-state";
import { SongPickerDialog } from "./song-picker-dialog";
import { PlaylistSourcePickerDialog } from "./playlist-source-picker-dialog";
import { formatDurationSeconds, sessionWindowSeconds } from "@/lib/business/schedule-duration";
import type { GeneratedSong } from "@/lib/business/ai-song-generator";
import type { Playlist } from "@/lib/business/content-queries";
import { cn } from "@/lib/utils";
import { useDialogTrigger } from "@/components/business/branches/new/use-dialog-trigger";
import { GenreChipPicker } from "@/components/business/genre-chip-picker";
import { AiSongsDialog, type AiLengthOption } from "@/components/business/ai-songs/ai-songs-dialog";

/** Below this much unfilled time, "fill the session" isn't offered. */
const MIN_FILL_SECONDS = 60;

const SOURCE_BADGE: Record<SessionSong["source"], { label: string; className: string }> = {
  ai: { label: "AI", className: "bg-violet-500/15 text-violet-400" },
  genre: { label: "Genre", className: "bg-violet-500/10 text-violet-300" },
  playlist: { label: "Playlist", className: "bg-muted text-muted-foreground" },
  search: { label: "Search", className: "bg-muted text-muted-foreground" },
};

export function PlaylistBuilder({
  startTime,
  endTime,
  genres,
  songs,
  onChange,
  businessPlaylists,
}: {
  startTime: string;
  endTime: string;
  genres: string[];
  songs: SessionSong[];
  onChange: (patch: { genres?: string[]; songs?: SessionSong[] }) => void;
  businessPlaylists: Playlist[];
}) {
  const songPicker = useDialogTrigger("playlist-songs");
  const playlistPicker = useDialogTrigger("playlist-source");
  const aiDialog = useDialogTrigger("playlist-ai");

  function addSongs(picked: SessionSong[]) {
    onChange({ songs: [...songs, ...picked] });
  }

  function removeSong(trackId: string) {
    onChange({ songs: songs.filter((s) => s.trackId !== trackId) });
  }

  const totalSeconds = songs.reduce((sum, s) => sum + (s.track.durationSeconds ?? 0), 0);
  const unresolvedCount = songs.filter((s) => s.track.durationSeconds == null).length;
  const windowSeconds = sessionWindowSeconds({ startTime, endTime });
  const remainingSeconds = Math.max(0, windowSeconds - totalSeconds);
  const canFill = remainingSeconds >= MIN_FILL_SECONDS;

  const aiLengths: AiLengthOption[] = [
    ...(canFill
      ? [{ id: "fill", label: `Fill ${formatDurationSeconds(remainingSeconds)}`, target: { kind: "duration" as const, seconds: remainingSeconds } }]
      : []),
    { id: "10", label: "10 songs", target: { kind: "count", count: 10 } },
    { id: "30m", label: "30 min", target: { kind: "duration", seconds: 30 * 60 } },
  ];

  function addGenerated(generated: GeneratedSong[], genresUsed: string[]): boolean {
    const existing = new Set(songs.map((s) => s.trackId));
    const fresh = generated.filter((g) => !existing.has(g.track.id));
    onChange({
      songs: [...songs, ...fresh.map((g) => ({ trackId: g.track.id, track: g.track, source: g.source }))],
      // A session without genres adopts generation's — they also drive the
      // kiosk's genre fallback when the session has no songs.
      ...(genres.length === 0 && genresUsed.length ? { genres: genresUsed } : {}),
    });
    toast.success(`Added ${fresh.length} song${fresh.length === 1 ? "" : "s"}`, {
      description: genresUsed.length ? `Matched to ${genresUsed.map(genreLabel).join(", ")}` : undefined,
    });
    return true;
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Genre preference</p>
        <p className="mb-2 text-xs text-muted-foreground">
          Guides AI generation, and plays when the session has no songs.
        </p>
        <GenreChipPicker value={genres} onChange={(next) => onChange({ genres: next })} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={aiDialog.show}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2.5 text-sm font-medium text-violet-300 transition-colors hover:bg-violet-500/20"
        >
          <Sparkles className="size-4" />
          Generate with AI
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
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Songs</p>
          <span className="text-right text-xs text-muted-foreground">
            {songs.length} song{songs.length === 1 ? "" : "s"} · {formatDurationSeconds(totalSeconds)} of{" "}
            {formatDurationSeconds(windowSeconds)}
            {unresolvedCount > 0 && ` · ${unresolvedCount} unknown length`}
          </span>
        </div>
        {windowSeconds > 0 && (
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", canFill ? "bg-violet-500" : "bg-emerald-500")}
              style={{ width: `${Math.min(100, (totalSeconds / windowSeconds) * 100)}%` }}
            />
          </div>
        )}
        {songs.length > 0 && canFill && (
          <button
            type="button"
            onClick={aiDialog.show}
            className="mt-1.5 text-xs font-medium text-violet-400 hover:text-violet-300"
          >
            {formatDurationSeconds(remainingSeconds)} left to fill — generate the rest with AI
          </button>
        )}

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
                        SOURCE_BADGE[song.source].className,
                      )}
                    >
                      {SOURCE_BADGE[song.source].label}
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
            <p className="text-sm text-muted-foreground">
              No songs yet — generate with AI to fill this session, search, or add from a playlist.
            </p>
          </div>
        )}
      </div>

      <AiSongsDialog
        key={aiDialog.dialogKey}
        open={aiDialog.open}
        onOpenChange={aiDialog.onOpenChange}
        description="Describe the mood for this session. Songs are picked to cover its time, and you review them before adding."
        initialGenres={genres}
        seeds={songs.map((s) => ({ title: s.track.title, artist: s.track.artist ?? "" }))}
        excludeYoutubeIds={songs.map((s) => s.track.youtubeId)}
        lengthOptions={aiLengths}
        lengthHint={
          canFill
            ? `This session runs ${formatDurationSeconds(windowSeconds)}; ${formatDurationSeconds(remainingSeconds)} isn't covered yet.`
            : "This session is already filled — extra songs just add variety."
        }
        onAdd={addGenerated}
      />
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
