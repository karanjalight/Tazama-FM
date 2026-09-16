"use client";

import * as React from "react";
import Image from "next/image";
import { toast } from "sonner";
import { FileImage, FileText, Library, Music, RotateCcw, UploadCloud, Video } from "lucide-react";

import type { ContentItem } from "@/lib/business/content-queries";
import { uploadAdCreative } from "@/app/business/advertisements/actions";
import { formatDuration } from "@/lib/business/content-format";
import type { CampaignDraft } from "../campaign-draft";
import { CreativePickerDialog } from "./creative-picker-dialog";
import { useDialogTrigger } from "@/components/business/branches/new/use-dialog-trigger";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TYPE_ICON = { video: Video, image: FileImage, audio: Music, document: FileText } as const;

function contentTypeForFile(file: File): "video" | "image" | "audio" {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "image";
}

/** Best-effort real-duration probe, same technique as Content Library's own
 * upload dialog — an image has no natural duration and never reaches this. */
function probeDuration(file: File): Promise<number | null> {
  if (!/^(video|audio)\//.test(file.type)) return Promise.resolve(null);
  return new Promise((resolve) => {
    const el = document.createElement(file.type.startsWith("video/") ? "video" : "audio");
    const url = URL.createObjectURL(file);
    el.preload = "metadata";
    el.src = url;
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(el.duration) ? el.duration : null);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
  });
}

export function CreativeStep({
  creatives,
  draft,
  onChange,
  onCreativeUploaded,
}: {
  creatives: ContentItem[];
  draft: CampaignDraft;
  onChange: (patch: Partial<CampaignDraft>) => void;
  onCreativeUploaded: (item: ContentItem) => void;
}) {
  const libraryPicker = useDialogTrigger("creative-library");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const selected = draft.creativeId ? (creatives.find((c) => c.id === draft.creativeId) ?? null) : null;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.set("title", file.name);
    formData.set("contentType", contentTypeForFile(file));
    formData.set("file", file);
    const durationSeconds = await probeDuration(file);
    if (durationSeconds !== null) formData.set("durationSeconds", String(Math.round(durationSeconds)));

    const res = await uploadAdCreative(formData);
    setUploading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    onCreativeUploaded(res.item);
    onChange({ creativeId: res.item.id });
    toast.success("Creative uploaded — pending review.");
  }

  function reset() {
    onChange({ creativeId: null });
  }

  if (selected) {
    const Icon = TYPE_ICON[selected.contentType];
    return (
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">Creative</p>
          <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-muted">
            {selected.contentType === "video" && selected.url ? (
              <video src={selected.url} controls className="size-full object-cover" />
            ) : selected.contentType === "image" && selected.previewUrl ? (
              <Image src={selected.previewUrl} alt="" fill sizes="500px" className="object-cover" unoptimized />
            ) : (
              <div className="grid h-full place-items-center bg-linear-to-br from-violet-500/20 to-fuchsia-500/20">
                <Icon className="size-8 text-foreground/40" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={reset}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline underline-offset-2"
          >
            <RotateCcw className="size-3.5" />
            Replace Creative
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Creative Name</Label>
            <Input value={selected.title} readOnly />
          </div>
          <div className="space-y-1.5">
            <Label>Format</Label>
            <Input value={selected.contentType} readOnly className="capitalize" />
          </div>
          <div className="space-y-1.5">
            <Label>Duration</Label>
            <Input value={selected.durationSeconds != null ? formatDuration(selected.durationSeconds) : "—"} readOnly />
          </div>
        </div>
        {(selected.contentType === "image" || selected.contentType === "document") && (
          <div className="space-y-1.5 sm:max-w-xs">
            <Label htmlFor="camp-display-seconds">Show on screen for</Label>
            <div className="flex items-center gap-2">
              <Input
                id="camp-display-seconds"
                type="number"
                min={3}
                max={300}
                value={draft.displaySeconds}
                onChange={(e) => onChange({ displaySeconds: Math.round(Number(e.target.value) || 0) })}
              />
              <span className="text-sm text-muted-foreground">seconds</span>
            </div>
            {(draft.displaySeconds < 3 || draft.displaySeconds > 300) && (
              <p className="text-xs text-rose-400">Choose between 3 and 300 seconds.</p>
            )}
          </div>
        )}
        {selected.status !== "approved" && (
          <p className="text-xs text-amber-400">
            This creative is {selected.status} — it won&apos;t start playing until an admin approves it.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        Upload a new creative or choose an existing one from your Ad Library.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center transition-colors hover:border-violet-500/50 hover:bg-violet-500/5 disabled:opacity-50"
        >
          <span className="grid size-12 place-items-center rounded-full bg-violet-500/15 text-violet-400">
            <UploadCloud className="size-5.5" />
          </span>
          <span className="text-sm font-semibold text-foreground">{uploading ? "Uploading…" : "Upload Creative"}</span>
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
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*,audio/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <CreativePickerDialog
        key={libraryPicker.dialogKey}
        open={libraryPicker.open}
        onOpenChange={libraryPicker.onOpenChange}
        creatives={creatives}
        onPick={(id) => onChange({ creativeId: id })}
      />
    </div>
  );
}
