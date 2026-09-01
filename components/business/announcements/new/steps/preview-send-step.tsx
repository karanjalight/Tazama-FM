import { Send, CalendarClock } from "lucide-react";

import type { AnnouncementDraft } from "../announcement-draft";
import { formatDraftDuration } from "../announcement-draft";
import { AudioPreview } from "../../audio-preview";
import { PlaybackFlowDiagram } from "../../playback-flow-diagram";
import { ScheduleControls } from "../schedule-controls";
import { cn } from "@/lib/utils";

export function PreviewSendStep({
  draft,
  onChange,
}: {
  draft: AnnouncementDraft;
  onChange: (patch: Partial<AnnouncementDraft>) => void;
}) {
  const heard =
    draft.playbackMode === "pause"
      ? "Music → Pause → Announcement → Music resumes"
      : `Music → Volume reduces to ${draft.reducedVolumePercent}% → Announcement → Volume returns to 100%`;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Announcement Preview</h2>
      <p className="mb-3 text-sm text-muted-foreground">Double-check everything, then send or schedule it.</p>

      <AudioPreview src={draft.audioUrl} durationLabel={formatDraftDuration(draft.durationSeconds)} />

      <div className="mt-4">
        <p className="mb-2 text-sm font-semibold text-foreground">Playback behavior</p>
        <PlaybackFlowDiagram mode={draft.playbackMode} volumePercent={draft.reducedVolumePercent} />
        <p className="mt-2 text-center text-xs text-muted-foreground">
          You will hear: <span className="font-medium text-foreground">{heard}</span>
        </p>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="mb-2 text-sm font-semibold text-foreground">When should this send?</p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onChange({ sendMode: "now" })}
            className={cn(
              "flex items-center gap-2.5 rounded-xl border-2 p-3.5 text-left transition-colors",
              draft.sendMode === "now" ? "border-violet-500 bg-violet-500/10" : "border-border hover:bg-muted/40",
            )}
          >
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", draft.sendMode === "now" ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground")}>
              <Send className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-medium text-foreground">Send Now</span>
              <span className="block text-xs text-muted-foreground">Plays immediately on the selected devices.</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => onChange({ sendMode: "schedule" })}
            className={cn(
              "flex items-center gap-2.5 rounded-xl border-2 p-3.5 text-left transition-colors",
              draft.sendMode === "schedule" ? "border-violet-500 bg-violet-500/10" : "border-border hover:bg-muted/40",
            )}
          >
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", draft.sendMode === "schedule" ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground")}>
              <CalendarClock className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-medium text-foreground">Schedule</span>
              <span className="block text-xs text-muted-foreground">Choose a date, time, and repeat pattern.</span>
            </span>
          </button>
        </div>

        {draft.sendMode === "schedule" && (
          <div className="mt-3">
            <ScheduleControls draft={draft} onChange={onChange} />
          </div>
        )}
      </div>
    </div>
  );
}
