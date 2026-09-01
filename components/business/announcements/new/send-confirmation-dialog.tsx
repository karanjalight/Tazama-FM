import type { AnnouncementDraft } from "./announcement-draft";
import { formatDraftDuration } from "./announcement-draft";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VioletButton } from "@/components/business/branches/new/violet-button";

export function SendConfirmationDialog({
  open,
  onOpenChange,
  draft,
  deviceCount,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: AnnouncementDraft;
  deviceCount: number;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Send Announcement?</DialogTitle>
          <DialogDescription>{draft.title || "Untitled announcement"}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 rounded-xl border border-border bg-muted/20 p-3.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Target</span>
            <span className="font-medium text-foreground">{deviceCount} devices</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Playback</span>
            <span className="font-medium text-foreground">{draft.playbackMode === "pause" ? "Pause Music" : "Reduce Volume"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-mono font-medium text-foreground">{formatDraftDuration(draft.durationSeconds)}</span>
          </div>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">This announcement will play immediately on the selected devices.</p>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <VioletButton type="button" onClick={onConfirm}>
            Send Announcement
          </VioletButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
