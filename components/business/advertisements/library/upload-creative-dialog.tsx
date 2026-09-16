"use client";

import * as React from "react";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";

import { uploadAdCreative } from "@/app/business/advertisements/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VioletButton } from "@/components/business/branches/new/violet-button";

type CreativeContentType = "video" | "image" | "audio";

function contentTypeForFile(file: File): CreativeContentType {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "image";
}

export function UploadCreativeDialog({
  open,
  onOpenChange,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: () => void;
}) {
  const [name, setName] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [durationSeconds, setDurationSeconds] = React.useState<number | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function reset() {
    setName("");
    setFile(null);
    setDurationSeconds(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  // Best-effort real-duration probe, same technique as Content Library's own
  // upload dialog — an image has no natural duration and never reaches this.
  function handleFileChange(next: File | null) {
    setFile(next);
    setDurationSeconds(null);
    if (!next || !/^(video|audio)\//.test(next.type)) return;
    const el = document.createElement(next.type.startsWith("video/") ? "video" : "audio");
    const url = URL.createObjectURL(next);
    el.preload = "metadata";
    el.src = url;
    el.onloadedmetadata = () => {
      if (Number.isFinite(el.duration)) setDurationSeconds(el.duration);
      URL.revokeObjectURL(url);
    };
    el.onerror = () => URL.revokeObjectURL(url);
  }

  async function handleUpload() {
    if (!file) return;
    setSubmitting(true);
    const formData = new FormData();
    formData.set("title", name.trim() || file.name);
    formData.set("contentType", contentTypeForFile(file));
    formData.set("file", file);
    if (durationSeconds !== null) formData.set("durationSeconds", String(Math.round(durationSeconds)));
    const res = await uploadAdCreative(formData);
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Creative uploaded — pending review.");
    reset();
    onOpenChange(false);
    onUploaded();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Upload Creative</DialogTitle>
          <DialogDescription>
            Add a video, image or audio file to your Ad Library. New uploads start Pending until
            reviewed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-input py-6 text-center transition-colors hover:bg-muted/40"
          >
            <UploadCloud className="size-6 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{file ? file.name : "Choose a file"}</span>
            <span className="text-xs text-muted-foreground">Video, image or audio</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="video/*,image/*,audio/*"
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />

          <div className="space-y-1.5">
            <Label htmlFor="creative-name">Creative Name</Label>
            <Input
              id="creative-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={file?.name ?? "e.g. Weekend Special"}
              maxLength={120}
            />
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <VioletButton type="button" disabled={!file || submitting} onClick={handleUpload}>
            {submitting ? "Uploading…" : "Upload"}
          </VioletButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
