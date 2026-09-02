"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";

import type { ScheduleSession } from "../schedule-state";
import { describeSessionBehavior, formatTimeLabel } from "./session-utils";
import { LayerToggles } from "./layer-toggles";
import { ContentSelector } from "./content-selector";
import { ContentOptionsPanel } from "./content-options-panel";
import { PlaylistBuilder } from "./playlist-builder";
import { SessionAdConfig } from "./session-ad-config";
import type { ContentItem, Playlist } from "@/lib/business/content-queries";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { VioletButton } from "@/components/business/branches/new/violet-button";

export function SessionContentDialog({
  session,
  onOpenChange,
  onSave,
  businessContent,
  businessAds,
  businessPlaylists,
}: {
  session: ScheduleSession;
  onOpenChange: (open: boolean) => void;
  onSave: (updated: ScheduleSession) => void;
  businessContent: ContentItem[];
  businessAds: ContentItem[];
  businessPlaylists: Playlist[];
}) {
  const [draft, setDraft] = React.useState<ScheduleSession>(session);

  function patch(p: Partial<ScheduleSession>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function handleSave() {
    onSave(draft);
    onOpenChange(false);
  }

  const bothOn = draft.contentEnabled && draft.playlistEnabled;
  const nothingOn = !draft.contentEnabled && !draft.playlistEnabled && !draft.adsEnabled;

  const adConfigValue = {
    selectedAds: draft.selectedAds,
    adFrequency: draft.adFrequency,
    adMaxPlaysPerDay: draft.adMaxPlaysPerDay,
    adPosition: draft.adPosition,
    adMinSpacingEnabled: draft.adMinSpacingEnabled,
    adMinSpacingMinutes: draft.adMinSpacingMinutes,
    adNoRepeatEnabled: draft.adNoRepeatEnabled,
    adNoRepeatMinutes: draft.adNoRepeatMinutes,
    respectOfflineTime: draft.respectOfflineTime,
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{session.label}</DialogTitle>
          <DialogDescription>
            {formatTimeLabel(session.startTime)} – {formatTimeLabel(session.endTime)} · {session.transition} transition
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className="mb-1 text-sm font-semibold text-foreground">What plays in this session?</p>
            <p className="mb-2 text-xs text-muted-foreground">Turn on any combination — each has its own schedule.</p>
            <LayerToggles
              contentEnabled={draft.contentEnabled}
              playlistEnabled={draft.playlistEnabled}
              adsEnabled={draft.adsEnabled}
              onToggle={(layer, next) =>
                patch(
                  layer === "content"
                    ? { contentEnabled: next }
                    : layer === "playlist"
                      ? { playlistEnabled: next }
                      : { adsEnabled: next },
                )
              }
            />
          </div>

          {nothingOn && (
            <p className="rounded-xl border border-dashed border-input py-6 text-center text-sm text-muted-foreground">
              Nothing enabled — screens will default to background music videos until you turn something on.
            </p>
          )}

          {draft.contentEnabled && (
            <div className="border-t border-border pt-4">
              <p className="mb-3 text-sm font-semibold text-foreground">Content</p>
              <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
                <ContentSelector
                  businessContent={businessContent}
                  selected={draft.selectedContent}
                  onChange={(items) => patch({ selectedContent: items })}
                />
                <ContentOptionsPanel
                  value={{
                    contentOrder: draft.contentOrder,
                    fit: draft.fit,
                    color: draft.backgroundColor,
                    repeat: draft.contentRepeat,
                    frequencyMode: draft.contentFrequencyMode,
                    frequencyIntervalMinutes: draft.contentFrequencyIntervalMinutes,
                  }}
                  showFrequency={draft.playlistEnabled}
                  onChange={(p) =>
                    patch({
                      ...(p.contentOrder !== undefined && { contentOrder: p.contentOrder }),
                      ...(p.fit !== undefined && { fit: p.fit }),
                      ...(p.color !== undefined && { backgroundColor: p.color }),
                      ...(p.repeat !== undefined && { contentRepeat: p.repeat }),
                      ...(p.frequencyMode !== undefined && { contentFrequencyMode: p.frequencyMode }),
                      ...(p.frequencyIntervalMinutes !== undefined && { contentFrequencyIntervalMinutes: p.frequencyIntervalMinutes }),
                    })
                  }
                />
              </div>
            </div>
          )}

          {bothOn && (
            <div className="rounded-xl border border-border bg-muted/20 p-3.5">
              <p className="mb-2 text-sm font-medium text-foreground">How should content and music interact?</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className={cn("flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5", draft.contentPlaylistInteraction === "background" ? "border-violet-500 bg-violet-500/10" : "border-border hover:bg-muted/40")}>
                  <input
                    type="radio"
                    name="content-playlist-interaction"
                    checked={draft.contentPlaylistInteraction === "background"}
                    onChange={() => patch({ contentPlaylistInteraction: "background" })}
                    className="mt-1 size-4 shrink-0 accent-violet-600"
                  />
                  <span>
                    <span className="block text-sm text-foreground">Music plays in the background</span>
                    <span className="block text-xs text-muted-foreground">Content shows on screen while the playlist keeps playing.</span>
                  </span>
                </label>
                <label className={cn("flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5", draft.contentPlaylistInteraction === "pause-music" ? "border-violet-500 bg-violet-500/10" : "border-border hover:bg-muted/40")}>
                  <input
                    type="radio"
                    name="content-playlist-interaction"
                    checked={draft.contentPlaylistInteraction === "pause-music"}
                    onChange={() => patch({ contentPlaylistInteraction: "pause-music" })}
                    className="mt-1 size-4 shrink-0 accent-violet-600"
                  />
                  <span>
                    <span className="block text-sm text-foreground">Content pauses the music</span>
                    <span className="block text-xs text-muted-foreground">Playlist pauses whenever content is playing.</span>
                  </span>
                </label>
              </div>
            </div>
          )}

          {draft.playlistEnabled && (
            <div className="border-t border-border pt-4">
              <p className="mb-3 text-sm font-semibold text-foreground">Playlist</p>
              <PlaylistBuilder
                genres={draft.genres}
                songs={draft.songs}
                onChange={(p) => patch(p)}
                businessPlaylists={businessPlaylists}
              />
            </div>
          )}

          {draft.adsEnabled && (
            <div className="border-t border-border pt-4">
              <p className="text-sm font-semibold text-foreground">Advertisement</p>
              <p className="mb-3 text-xs text-muted-foreground">Ads always pause content and music, play alone, then hand control back.</p>
              <SessionAdConfig value={adConfigValue} onChange={(p) => patch(p)} businessAds={businessAds} />
            </div>
          )}

          {!nothingOn && (
            <div className="flex items-start gap-2.5 rounded-xl bg-violet-500/10 p-3.5">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-violet-400" />
              <p className="text-sm text-violet-200">{describeSessionBehavior(draft)}</p>
            </div>
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
          <VioletButton type="button" onClick={handleSave} disabled={nothingOn}>
            Save Content
          </VioletButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
