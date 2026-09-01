"use client";

import * as React from "react";
import Image from "next/image";
import { FileImage, Library, Music, RotateCcw, UploadCloud, Video } from "lucide-react";

import { CREATIVES } from "../../mock-data";
import type { CampaignDraft } from "../campaign-draft";
import { CreativePickerDialog } from "./creative-picker-dialog";
import { useDialogTrigger } from "@/components/business/branches/new/use-dialog-trigger";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TYPE_ICON = { Video, Image: FileImage, Audio: Music } as const;

export function CreativeStep({ draft, onChange }: { draft: CampaignDraft; onChange: (patch: Partial<CampaignDraft>) => void }) {
  const libraryPicker = useDialogTrigger("creative-library");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const libraryCreative = draft.creativeId ? CREATIVES.find((c) => c.id === draft.creativeId) : null;
  const hasCreative = !!libraryCreative || !!draft.uploadedCreative;

  function handleFile(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const format = file.type.startsWith("video") ? "Video" : file.type.startsWith("audio") ? "Audio" : "Image";
    if (format === "Video" || format === "Audio") {
      const probe = format === "Video" ? document.createElement("video") : new Audio();
      probe.src = url;
      probe.addEventListener("loadedmetadata", () => {
        const seconds = Number.isFinite(probe.duration) ? Math.round(probe.duration) : 0;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        onChange({
          creativeId: null,
          uploadedCreative: { name: file.name, format, url, durationLabel: `${m}:${String(s).padStart(2, "0")}` },
        });
      });
    } else {
      onChange({ creativeId: null, uploadedCreative: { name: file.name, format, url, durationLabel: null } });
    }
  }

  function reset() {
    onChange({ creativeId: null, uploadedCreative: null });
  }

  if (hasCreative) {
    const name = libraryCreative?.name ?? draft.uploadedCreative?.name ?? "";
    const format = libraryCreative?.format ?? draft.uploadedCreative?.format ?? "Video";
    const duration = libraryCreative?.durationLabel ?? draft.uploadedCreative?.durationLabel ?? null;
    const thumbnail = libraryCreative?.thumbnail ?? null;
    const videoUrl = draft.uploadedCreative?.format === "Video" ? draft.uploadedCreative.url : null;
    const imageUrl = draft.uploadedCreative?.format === "Image" ? draft.uploadedCreative.url : null;
    const Icon = TYPE_ICON[format];

    return (
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">Creative</p>
          <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-muted">
            {videoUrl ? (
              <video src={videoUrl} controls className="size-full object-cover" />
            ) : imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- local blob: preview, next/image cannot optimize it
              <img src={imageUrl} alt="" className="size-full object-cover" />
            ) : thumbnail ? (
              <Image src={thumbnail} alt="" fill sizes="500px" className="object-cover" unoptimized />
            ) : (
              <div className="grid h-full place-items-center bg-linear-to-br from-violet-500/20 to-fuchsia-500/20">
                <Icon className="size-8 text-foreground/40" />
              </div>
            )}
          </div>
          <button type="button" onClick={reset} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline underline-offset-2">
            <RotateCcw className="size-3.5" />
            Replace Creative
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Creative Name</Label>
            <Input value={name} readOnly />
          </div>
          <div className="space-y-1.5">
            <Label>Format</Label>
            <Input value={format} readOnly />
          </div>
          <div className="space-y-1.5">
            <Label>Duration</Label>
            <Input value={duration ?? "—"} readOnly />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">Upload a new creative or choose an existing one from your Ad Library.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center transition-colors hover:border-violet-500/50 hover:bg-violet-500/5"
        >
          <span className="grid size-12 place-items-center rounded-full bg-violet-500/15 text-violet-400">
            <UploadCloud className="size-5.5" />
          </span>
          <span className="text-sm font-semibold text-foreground">Upload Creative</span>
          <span className="text-xs text-muted-foreground">Video, image or audio</span>
        </button>
        <button
          type="button"
          onClick={libraryPicker.show}
          className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center transition-colors hover:border-violet-500/50 hover:bg-violet-500/5"
        >
          <span className="grid size-12 place-items-center rounded-full bg-violet-500/15 text-violet-400">
            <Library className="size-5.5" />
          </span>
          <span className="text-sm font-semibold text-foreground">Choose from Ad Library</span>
          <span className="text-xs text-muted-foreground">Reuse an existing creative</span>
        </button>
      </div>
      <input ref={fileInputRef} type="file" accept="video/*,image/*,audio/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />

      <CreativePickerDialog key={libraryPicker.dialogKey} open={libraryPicker.open} onOpenChange={libraryPicker.onOpenChange} onPick={(id) => onChange({ creativeId: id, uploadedCreative: null })} />
    </div>
  );
}
