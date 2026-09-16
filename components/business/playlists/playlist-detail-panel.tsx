"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Infinity as InfinityIcon, ListMusic, Pencil, Plus, Repeat, Sparkles, Trash2, X } from "lucide-react";

import type { Playlist, PlaylistPlaybackMode } from "@/lib/business/content-queries";
import type { GeneratedSong } from "@/lib/business/ai-song-generator";
import { formatDurationSeconds } from "@/lib/business/schedule-duration";
import { genreLabel } from "@/lib/genres";
import { formatRelativeTime, cn } from "@/lib/utils";
import {
  updatePlaylist,
  deletePlaylist,
  removeTrackFromPlaylist,
  addCatalogTracksToPlaylist,
} from "@/app/business/content/actions";
import { AddTracksDialog } from "./add-tracks-dialog";
import { AiSongsDialog, type AiLengthOption } from "@/components/business/ai-songs/ai-songs-dialog";
import { GenreChipPicker } from "@/components/business/genre-chip-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const PLAYLIST_AI_LENGTHS: AiLengthOption[] = [
  { id: "15", label: "15 songs", target: { kind: "count", count: 15 } },
  { id: "30m", label: "30 min", target: { kind: "duration", seconds: 30 * 60 } },
  { id: "1h", label: "1 hour", target: { kind: "duration", seconds: 60 * 60 } },
  { id: "2h", label: "2 hours", target: { kind: "duration", seconds: 2 * 60 * 60 } },
];
const MAX_PLAYLIST_GENRES = 5;

function sameGenres(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((g) => b.includes(g));
}

/**
 * The caller MUST render this keyed by `playlist.id` (`key={playlist.id}`) —
 * local edit-draft state is only initialized once per mount, and switching
 * to a different playlist is meant to remount (reset drafts) rather than
 * sync via an effect.
 *
 * `openAiOnMount` opens the AI dialog straight away (seeded with
 * `aiPrompt`) — the Create Playlist dialog's "Build with AI" hand-off.
 */
export function PlaylistDetailPanel({
  playlist,
  businessId,
  onClose,
  openAiOnMount = false,
  aiPrompt,
}: {
  playlist: Playlist;
  businessId: string;
  onClose: () => void;
  openAiOnMount?: boolean;
  aiPrompt?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(playlist.name);
  const [description, setDescription] = React.useState(playlist.description ?? "");
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [togglingStatus, setTogglingStatus] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [removingTrackId, setRemovingTrackId] = React.useState<string | null>(null);
  const [aiOpen, setAiOpen] = React.useState(openAiOnMount);
  const [aiDialogKey, setAiDialogKey] = React.useState(0);
  const [savingMode, setSavingMode] = React.useState(false);
  const [editingGenres, setEditingGenres] = React.useState(false);
  const [genreDraft, setGenreDraft] = React.useState<string[]>(playlist.genres);
  const [savingGenres, setSavingGenres] = React.useState(false);

  const totalSeconds = playlist.tracks.reduce((sum, t) => sum + (t.track.durationSeconds ?? 0), 0);

  function openAi() {
    setAiDialogKey((k) => k + 1);
    setAiOpen(true);
  }

  async function handleModeChange(mode: PlaylistPlaybackMode) {
    if (mode === playlist.playbackMode) return;
    setSavingMode(true);
    const res = await updatePlaylist({ businessId, id: playlist.id, playbackMode: mode });
    setSavingMode(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(mode === "continuous" ? "Continuous playback on." : "Playlist will repeat its songs.", {
      description:
        mode === "continuous"
          ? "Fresh genre and AI songs are being lined up to blend in with yours."
          : undefined,
    });
    router.refresh();
  }

  async function handleSaveGenres() {
    setSavingGenres(true);
    const res = await updatePlaylist({ businessId, id: playlist.id, genres: genreDraft });
    setSavingGenres(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Genres saved.");
    setEditingGenres(false);
    router.refresh();
  }

  async function handleAddGenerated(songs: GeneratedSong[], genresUsed: string[]): Promise<boolean> {
    const res = await addCatalogTracksToPlaylist({
      businessId,
      playlistId: playlist.id,
      trackIds: songs.map((s) => s.track.id),
    });
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    // A playlist with no genres yet adopts the ones generation used, so
    // continuous playback has something to blend in. Best-effort.
    let adoptedGenres = false;
    if (!playlist.genres.length && genresUsed.length) {
      const genreRes = await updatePlaylist({
        businessId,
        id: playlist.id,
        genres: genresUsed.slice(0, MAX_PLAYLIST_GENRES),
      });
      adoptedGenres = genreRes.ok;
    }
    toast.success(
      res.added ? `Added ${res.added} song${res.added === 1 ? "" : "s"}.` : "Those songs were already on the playlist.",
      { description: adoptedGenres ? `Genres set to ${genresUsed.map(genreLabel).join(", ")}.` : undefined },
    );
    router.refresh();
    return true;
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    const res = await updatePlaylist({
      businessId,
      id: playlist.id,
      name: trimmed,
      description: description.trim(),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Playlist updated.");
    setEditing(false);
    router.refresh();
  }

  async function handleToggleStatus() {
    const next = playlist.status === "active" ? "draft" : "active";
    setTogglingStatus(true);
    const res = await updatePlaylist({ businessId, id: playlist.id, status: next });
    setTogglingStatus(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(next === "active" ? "Playlist activated." : "Playlist set to draft.");
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Delete "${playlist.name}"? This can't be undone.`)) return;
    setDeleting(true);
    const res = await deletePlaylist({ businessId, id: playlist.id });
    setDeleting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Playlist deleted.");
    onClose();
    router.refresh();
  }

  async function handleRemoveTrack(trackId: string) {
    setRemovingTrackId(trackId);
    const res = await removeTrackFromPlaylist({ businessId, playlistId: playlist.id, trackId });
    setRemovingTrackId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative aspect-video bg-muted">
        {playlist.coverUrl ? (
          <Image src={playlist.coverUrl} alt="" fill sizes="400px" className="object-cover" unoptimized />
        ) : (
          <div className="grid h-full place-items-center bg-linear-to-br from-violet-500/20 to-fuchsia-500/20">
            <ListMusic className="size-10 text-foreground/40" />
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="absolute top-2.5 right-2.5 grid size-7 place-items-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          {editing ? (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 min-w-0 flex-1 text-base font-semibold"
              maxLength={80}
            />
          ) : (
            <h2 className="text-lg font-semibold text-foreground">{playlist.name}</h2>
          )}
          <button
            type="button"
            onClick={handleToggleStatus}
            disabled={togglingStatus}
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-50",
              playlist.status === "active"
                ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {playlist.status === "active" ? "Active" : "Draft"}
          </button>
        </div>

        {editing ? (
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-2"
            maxLength={300}
            placeholder="Describe this playlist"
          />
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">{playlist.description || "No description yet."}</p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground">
              <ListMusic className="size-4" />
            </span>
            <p className="mt-1.5 font-mono text-lg font-semibold text-foreground">{playlist.tracks.length}</p>
            <p className="text-xs text-muted-foreground">
              Tracks{totalSeconds > 0 && ` · ${formatDurationSeconds(totalSeconds)}`}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="mt-1.5 text-lg font-semibold text-foreground">{formatRelativeTime(playlist.createdAt)}</p>
            <p className="text-xs text-muted-foreground">Created</p>
          </div>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">Playback</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(
              [
                { mode: "repeat", label: "Repeat", hint: "Loops your saved songs", Icon: Repeat },
                { mode: "continuous", label: "Continuous", hint: "Blends in fresh songs, never loops", Icon: InfinityIcon },
              ] as const
            ).map(({ mode, label, hint, Icon }) => {
              const selected = playlist.playbackMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={selected}
                  disabled={savingMode}
                  onClick={() => handleModeChange(mode)}
                  className={cn(
                    "rounded-xl border p-2.5 text-left transition-colors disabled:opacity-60",
                    selected ? "border-violet-500 bg-violet-500/10" : "border-border hover:bg-muted/40",
                  )}
                >
                  <span className={cn("flex items-center gap-1.5 text-sm font-medium", selected ? "text-violet-300" : "text-foreground")}>
                    <Icon className="size-3.5" />
                    {label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{hint}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Genres</p>
              {!editingGenres && (
                <button
                  type="button"
                  onClick={() => {
                    setGenreDraft(playlist.genres);
                    setEditingGenres(true);
                  }}
                  className="text-xs font-medium text-violet-400 hover:text-violet-300"
                >
                  {playlist.genres.length ? "Edit" : "Add genres"}
                </button>
              )}
            </div>
            {editingGenres ? (
              <div className="mt-2">
                <GenreChipPicker value={genreDraft} onChange={setGenreDraft} max={MAX_PLAYLIST_GENRES} compact />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingGenres(false)}
                    className="rounded-lg border border-input px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingGenres || sameGenres(genreDraft, playlist.genres)}
                    onClick={handleSaveGenres}
                    className="rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
                  >
                    {savingGenres ? "Saving…" : "Save genres"}
                  </button>
                </div>
              </div>
            ) : playlist.genres.length ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {playlist.genres.map((g) => (
                  <span key={g} className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[11px] font-medium text-violet-300">
                    {genreLabel(g)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {playlist.playbackMode === "continuous"
                  ? "No genres — continuous playback blends in AI picks only. Add genres for fresh genre songs too."
                  : "Genres guide AI generation and continuous playback."}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Tracks</p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={openAi}
                className="inline-flex items-center gap-1 rounded-lg border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-300 transition-colors hover:bg-violet-500/20"
              >
                <Sparkles className="size-3.5" />
                Generate with AI
              </button>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-input px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Plus className="size-3.5" />
                Add Tracks
              </button>
            </div>
          </div>
          {playlist.tracks.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No tracks yet — generate some with AI or add them from YouTube.</p>
          ) : (
            <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
              {playlist.tracks.map((pt) => (
                <li key={pt.id} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-muted/40">
                  <div className="relative size-9 shrink-0 overflow-hidden rounded-md bg-muted">
                    {pt.track.thumbnailUrl && (
                      <Image src={pt.track.thumbnailUrl} alt="" fill sizes="36px" className="object-cover" unoptimized />
                    )}
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{pt.track.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{pt.track.artist ?? "Unknown"}</span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${pt.track.title}`}
                    disabled={removingTrackId === pt.trackId}
                    onClick={() => handleRemoveTrack(pt.trackId)}
                    className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 flex gap-2 border-t border-border pt-4">
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setName(playlist.name);
                  setDescription(playlist.description ?? "");
                }}
                className="flex-1 rounded-xl border border-input py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-input py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Pencil className="size-3.5" />
                Edit Playlist
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-strong py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#a82420] disabled:opacity-50"
              >
                <Trash2 className="size-3.5" />
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </>
          )}
        </div>
      </div>

      <AddTracksDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        businessId={businessId}
        playlistId={playlist.id}
      />
      <AiSongsDialog
        key={aiDialogKey}
        open={aiOpen}
        onOpenChange={setAiOpen}
        description={`Describe what "${playlist.name}" should sound like, then review the songs before adding them.`}
        initialPrompt={aiPrompt ?? (playlist.tracks.length ? "" : [playlist.name, playlist.description].filter(Boolean).join(" — "))}
        initialGenres={playlist.genres}
        seeds={playlist.tracks.map((t) => ({ title: t.track.title, artist: t.track.artist ?? "" }))}
        excludeYoutubeIds={playlist.tracks.map((t) => t.track.youtubeId)}
        lengthOptions={PLAYLIST_AI_LENGTHS}
        onAdd={handleAddGenerated}
      />
    </div>
  );
}
