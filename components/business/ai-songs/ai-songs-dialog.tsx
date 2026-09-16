"use client";

import * as React from "react";
import Image from "next/image";
import { Check, ChevronLeft, Loader2, Music, RefreshCw, Sparkles } from "lucide-react";

import { generateBusinessSongs, type GenerateBusinessSongsResult } from "@/app/business/ai-songs/actions";
import type { GeneratedSong } from "@/lib/business/ai-song-generator";
import { MAX_PROMPT_LENGTH, type AiSongQuery, type SongTarget } from "@/lib/business/ai-songs";
import { formatDurationSeconds } from "@/lib/business/schedule-duration";
import { genreLabel } from "@/lib/genres";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GenreChipPicker } from "@/components/business/genre-chip-picker";
import { VioletButton } from "@/components/business/branches/new/violet-button";

export interface AiLengthOption {
  id: string;
  label: string;
  target: SongTarget;
}

const EXAMPLE_PROMPTS = [
  "Chill café morning",
  "Upbeat lunch rush",
  "Sunset lounge vibes",
  "High-energy gym hour",
  "Elegant dinner jazz",
];
const MAX_GENRES = 5;
/** Error codes where the model is the problem — genres-only still works. */
const GENRES_FALLBACK_CODES = new Set(["ai_not_configured", "ai_unavailable", "limit", "no_songs"]);

type Mode = "ai" | "genres";
type Failure = Extract<GenerateBusinessSongsResult, { ok: false }>;
type Success = Extract<GenerateBusinessSongsResult, { ok: true }>;

/**
 * Describe → review → add. Shared by a business playlist (detail panel +
 * "Build with AI" on create) and a Schedule session's playlist builder.
 * Nothing is saved here — `onAdd` receives the kept songs (already cataloged,
 * with real ids + durations) and returns true once the caller has stored
 * them. Callers remount it per open (`key`) to reset its state.
 */
export function AiSongsDialog({
  open,
  onOpenChange,
  description,
  initialPrompt = "",
  initialGenres,
  seeds,
  excludeYoutubeIds,
  lengthOptions,
  lengthHint,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  initialPrompt?: string;
  initialGenres: string[];
  seeds: AiSongQuery[];
  excludeYoutubeIds: string[];
  lengthOptions: AiLengthOption[];
  lengthHint?: string;
  onAdd: (songs: GeneratedSong[], genresUsed: string[]) => Promise<boolean> | boolean;
}) {
  const [prompt, setPrompt] = React.useState(initialPrompt.slice(0, MAX_PROMPT_LENGTH));
  const [genres, setGenres] = React.useState<string[]>(initialGenres.slice(0, MAX_GENRES));
  const [lengthId, setLengthId] = React.useState(lengthOptions[0]?.id ?? "");
  const [generating, setGenerating] = React.useState<Mode | null>(null);
  const [failure, setFailure] = React.useState<Failure | null>(null);
  const [result, setResult] = React.useState<(Success & { mode: Mode; target: SongTarget }) | null>(null);
  const [unchecked, setUnchecked] = React.useState<Set<string>>(new Set());
  const [adding, setAdding] = React.useState(false);

  const length = lengthOptions.find((o) => o.id === lengthId) ?? lengthOptions[0];

  async function generate(mode: Mode, avoid: string[] = []) {
    if (!length) return;
    setGenerating(mode);
    setFailure(null);
    const res = await generateBusinessSongs({
      mode,
      prompt: prompt.trim(),
      genres,
      seeds,
      excludeYoutubeIds: [...excludeYoutubeIds, ...avoid],
      target: length.target,
    });
    setGenerating(null);
    if (!res.ok) {
      setFailure(res);
      return;
    }
    setResult({ ...res, mode, target: length.target });
    setUnchecked(new Set());
  }

  function toggle(youtubeId: string) {
    setUnchecked((prev) => {
      const next = new Set(prev);
      if (next.has(youtubeId)) next.delete(youtubeId);
      else next.add(youtubeId);
      return next;
    });
  }

  const kept = result?.songs.filter((s) => !unchecked.has(s.track.youtubeId)) ?? [];
  const keptSeconds = kept.reduce((sum, s) => sum + (s.track.durationSeconds ?? 0), 0);
  const targetSeconds = result?.target.kind === "duration" ? result.target.seconds : null;

  async function handleAdd() {
    if (!result || !kept.length) return;
    setAdding(true);
    const done = await onAdd(kept, result.genresUsed);
    setAdding(false);
    if (done) onOpenChange(false);
  }

  const busy = generating !== null || adding;
  const canGenerateAi = !!prompt.trim() || genres.length > 0 || seeds.length > 0;

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <Sparkles className="size-4 text-violet-400" />
            Generate with AI
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {generating ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Loader2 className="size-6 animate-spin text-violet-400" />
            <p className="text-sm text-foreground">
              {generating === "ai" ? "Picking songs and finding them on YouTube…" : "Pulling songs from your genres…"}
            </p>
            <p className="text-xs text-muted-foreground">This can take up to half a minute.</p>
          </div>
        ) : result ? (
          <div className="space-y-3">
            {result.note && (
              <div className="flex items-start gap-2 rounded-xl bg-violet-500/10 p-3">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-violet-400" />
                <p className="text-xs text-violet-200">{result.note}</p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-foreground">
                  {kept.length} song{kept.length === 1 ? "" : "s"} · {formatDurationSeconds(keptSeconds)}
                  {targetSeconds !== null && (
                    <span className="text-muted-foreground"> of {formatDurationSeconds(targetSeconds)}</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setUnchecked(unchecked.size ? new Set() : new Set(result.songs.map((s) => s.track.youtubeId)))
                  }
                  className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  {unchecked.size ? "Select all" : "Select none"}
                </button>
              </div>
              {targetSeconds !== null && (
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      keptSeconds >= targetSeconds ? "bg-emerald-500" : "bg-violet-500",
                    )}
                    style={{ width: `${Math.min(100, (keptSeconds / targetSeconds) * 100)}%` }}
                  />
                </div>
              )}
              {result.genresUsed.length > 0 && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Genres: {result.genresUsed.map(genreLabel).join(", ")}
                  {result.remainingToday !== null && ` · ${result.remainingToday} AI generations left today`}
                </p>
              )}
            </div>

            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {result.songs.map((song) => {
                const checked = !unchecked.has(song.track.youtubeId);
                return (
                  <li key={song.track.youtubeId}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => toggle(song.track.youtubeId)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg border p-2 text-left transition-colors",
                        checked ? "border-violet-500/40 bg-violet-500/5" : "border-transparent opacity-50 hover:bg-muted/40",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-5 shrink-0 place-items-center rounded-md border",
                          checked ? "border-violet-600 bg-violet-600 text-white" : "border-input",
                        )}
                      >
                        {checked && <Check className="size-3" strokeWidth={3} />}
                      </span>
                      <span className="relative size-9 shrink-0 overflow-hidden rounded-md bg-muted">
                        {song.track.thumbnailUrl ? (
                          <Image src={song.track.thumbnailUrl} alt="" fill sizes="36px" className="object-cover" unoptimized />
                        ) : (
                          <Music className="m-auto mt-2.5 size-4 text-muted-foreground" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{song.track.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {song.track.artist ?? "Unknown"}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                          song.source === "ai" ? "bg-violet-500/15 text-violet-400" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {song.source === "ai" ? "AI" : "Genre"}
                      </span>
                      <span className="w-12 shrink-0 text-right font-mono text-xs text-muted-foreground">
                        {song.track.durationSeconds != null ? formatDurationSeconds(song.track.durationSeconds) : "—"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ai-songs-prompt">Describe the music</Label>
              <Textarea
                id="ai-songs-prompt"
                autoFocus
                rows={3}
                value={prompt}
                maxLength={MAX_PROMPT_LENGTH}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Laid-back Afro-house and soul for a Sunday brunch crowd"
              />
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLE_PROMPTS.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setPrompt(example)}
                    className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground">Genres</p>
              <p className="mb-2 text-xs text-muted-foreground">
                Optional — leave empty and the AI picks genres to top up with.
              </p>
              <GenreChipPicker value={genres} onChange={setGenres} max={MAX_GENRES} compact />
            </div>

            <div>
              <p className="text-sm font-medium text-foreground">Length</p>
              {lengthHint && <p className="text-xs text-muted-foreground">{lengthHint}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {lengthOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={option.id === length?.id}
                    onClick={() => setLengthId(option.id)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                      option.id === length?.id
                        ? "border-violet-500 bg-violet-500/10 text-violet-300"
                        : "border-border text-foreground hover:bg-muted/40",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {failure && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                {failure.error}
                {GENRES_FALLBACK_CODES.has(failure.code) && !genres.length && " Pick a genre to use genres only."}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-wrap">
          {result ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => setResult(null)}
                className="mr-auto inline-flex items-center gap-1 rounded-xl px-2 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                <ChevronLeft className="size-4" />
                Back
              </button>
              <VioletButton
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => generate(result.mode, result.songs.map((s) => s.track.youtubeId))}
              >
                <RefreshCw className="size-3.5" />
                Regenerate
              </VioletButton>
              <VioletButton type="button" disabled={busy || kept.length === 0} onClick={handleAdd}>
                {adding ? "Adding…" : `Add ${kept.length} song${kept.length === 1 ? "" : "s"}`}
              </VioletButton>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={busy || genres.length === 0}
                onClick={() => generate("genres")}
                title={genres.length ? undefined : "Pick at least one genre"}
                className="mr-auto rounded-xl px-2 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              >
                Use genres only
              </button>
              <VioletButton type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
                Cancel
              </VioletButton>
              <VioletButton type="button" disabled={busy || !canGenerateAi} onClick={() => generate("ai")}>
                <Sparkles className="size-4" />
                Generate
              </VioletButton>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
