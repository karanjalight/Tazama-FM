"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { uploadContentItem } from "@/app/business/content/actions";

const CONTENT_TYPES = ["video", "image", "audio", "document"] as const;
type ContentTypeOption = (typeof CONTENT_TYPES)[number];

const TYPE_LABEL: Record<ContentTypeOption, string> = {
  video: "Video",
  image: "Image",
  audio: "Audio",
  document: "Document",
};
const TYPE_ITEMS = CONTENT_TYPES.map((t) => TYPE_LABEL[t]);

/**
 * Self-contained "Upload Content" trigger + dialog for the Content Library
 * header. Builds a `FormData` client-side and hands it to the
 * `uploadContentItem` server action — same shape as the voice-notes upload
 * flow (`app/dashboard/chats/actions.ts`'s `uploadVoiceNoteAction`), just
 * with a real `<input type="file">` instead of a MediaRecorder blob.
 */
export function UploadContentDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [contentType, setContentType] = React.useState<ContentTypeOption>("video");
  const [file, setFile] = React.useState<File | null>(null);
  const [durationSeconds, setDurationSeconds] = React.useState<number | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function reset() {
    setTitle("");
    setContentType("video");
    setFile(null);
    setDurationSeconds(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Best-effort: read the file's own real duration client-side (the server
  // never decodes media) so Schedules can default a video/audio content
  // item's on-screen time to its actual length instead of asking staff to
  // guess. Failure just leaves durationSeconds null — an image (no natural
  // duration) never reaches this branch anyway.
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !file) return;
    setSubmitting(true);
    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("contentType", contentType);
    formData.set("file", file);
    if (durationSeconds !== null) formData.set("durationSeconds", String(Math.round(durationSeconds)));
    const res = await uploadContentItem(formData);
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Content uploaded — pending review.");
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-500"
          />
        }
      >
        <Upload className="size-4" />
        Upload Content
      </DialogTrigger>

      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Upload Content</DialogTitle>
            <DialogDescription>
              Add a video, image, audio clip, or document to your Content Library. New uploads
              start Pending until reviewed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="content-upload-title">Title</Label>
              <Input
                id="content-upload-title"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Happy Hour Promo"
                maxLength={120}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="content-upload-type">Type</Label>
              <Select
                id="content-upload-type"
                value={TYPE_LABEL[contentType]}
                onValueChange={(v) => {
                  const match = CONTENT_TYPES.find((t) => TYPE_LABEL[t] === v);
                  if (match) setContentType(match);
                }}
                items={TYPE_ITEMS}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="content-upload-file">File</Label>
              <input
                ref={fileInputRef}
                id="content-upload-file"
                type="file"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted/70"
              />
              <p className="text-xs text-muted-foreground">
                Video up to 200MB. Images, audio, and documents up to 20MB.
              </p>
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-input px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !file}
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
            >
              {submitting ? "Uploading…" : "Upload"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
