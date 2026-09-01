"use client";

import * as React from "react";
import { UploadCloud } from "lucide-react";

import { newCreativeId, type Creative } from "../mock-data";
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

export function UploadCreativeDialog({
  open,
  onOpenChange,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: (creative: Creative) => void;
}) {
  const [name, setName] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function reset() {
    setName("");
    setFile(null);
  }

  function handleUpload() {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const format = file.type.startsWith("video") ? "Video" : file.type.startsWith("audio") ? "Audio" : "Image";
    onUploaded({
      id: newCreativeId(),
      name: name.trim() || file.name,
      format,
      durationLabel: null,
      thumbnail: format === "Image" ? url : null,
      dimensions: format === "Audio" ? null : "1920 × 1080",
      uploadedLabel: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      archived: false,
    });
    reset();
    onOpenChange(false);
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
          <DialogDescription>Add a video, image or audio file to your Ad Library.</DialogDescription>
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
          <input ref={inputRef} type="file" accept="video/*,image/*,audio/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

          <div className="space-y-1.5">
            <Label htmlFor="creative-name">Creative Name</Label>
            <Input id="creative-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={file?.name ?? "e.g. Weekend Special"} />
          </div>
        </div>

        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
            Cancel
          </button>
          <VioletButton type="button" disabled={!file} onClick={handleUpload}>
            Upload
          </VioletButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
