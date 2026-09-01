"use client";

import * as React from "react";
import { Mic, RotateCcw, UploadCloud } from "lucide-react";

import type { AnnouncementDraft } from "../announcement-draft";
import { formatDraftDuration } from "../announcement-draft";
import { AudioRecorder } from "../../audio-recorder";
import { AudioUploader } from "../../audio-uploader";
import { AudioPreview } from "../../audio-preview";
import { cn } from "@/lib/utils";

type Mode = "choose" | "record" | "upload";

export function CreateAudioStep({
  draft,
  onChange,
}: {
  draft: AnnouncementDraft;
  onChange: (patch: Partial<AnnouncementDraft>) => void;
}) {
  const [mode, setMode] = React.useState<Mode>("choose");

  if (draft.audioUrl) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-semibold text-foreground">Announcement Audio</p>
        <p className="mb-3 text-xs text-muted-foreground">{formatDraftDuration(draft.durationSeconds)} ready to send.</p>
        <AudioPreview src={draft.audioUrl} durationLabel={formatDraftDuration(draft.durationSeconds)} />
        <button
          type="button"
          onClick={() => {
            onChange({ audioUrl: null, audioFile: null, durationSeconds: 0 });
            setMode("choose");
          }}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline underline-offset-2"
        >
          <RotateCcw className="size-3.5" />
          Replace audio
        </button>
      </div>
    );
  }

  if (mode === "record") {
    return (
      <AudioRecorder
        onCancel={() => setMode("choose")}
        onUse={({ url, durationSeconds, blob }) => onChange({ audioUrl: url, audioFile: blob, durationSeconds })}
      />
    );
  }

  if (mode === "upload") {
    return (
      <div>
        <AudioUploader
          onUse={({ url, durationSeconds, file }) => onChange({ audioUrl: url, audioFile: file, durationSeconds })}
        />
        <button
          type="button"
          onClick={() => setMode("choose")}
          className="mt-3 text-sm font-medium text-foreground underline underline-offset-2"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">Record your announcement or upload an existing file.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          { key: "record" as const, icon: Mic, title: "Record Announcement", desc: "Record your voice directly in Tazama.", cta: "Start Recording" },
          { key: "upload" as const, icon: UploadCloud, title: "Upload Audio", desc: "Upload an existing voice recording.", cta: "Choose File" },
        ].map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setMode(opt.key)}
            className={cn(
              "flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center transition-colors hover:border-violet-500/50 hover:bg-violet-500/5",
            )}
          >
            <span className="grid size-12 place-items-center rounded-full bg-violet-500/15 text-violet-400">
              <opt.icon className="size-5.5" />
            </span>
            <span className="text-sm font-semibold text-foreground">{opt.title}</span>
            <span className="text-xs text-muted-foreground">{opt.desc}</span>
            <span className="mt-1 rounded-xl bg-violet-600 px-4 py-2 text-xs font-medium text-white">{opt.cta}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
