import type { AnnouncementDraft } from "../announcement-draft";
import { PlaybackModeSelector } from "../../playback-mode-selector";

export function PlaybackStep({
  draft,
  onChange,
}: {
  draft: AnnouncementDraft;
  onChange: (patch: Partial<AnnouncementDraft>) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <PlaybackModeSelector
        mode={draft.playbackMode}
        volumePercent={draft.reducedVolumePercent}
        onChange={(patch) =>
          onChange({
            ...(patch.mode !== undefined && { playbackMode: patch.mode }),
            ...(patch.volumePercent !== undefined && { reducedVolumePercent: patch.volumePercent }),
          })
        }
      />
    </div>
  );
}
