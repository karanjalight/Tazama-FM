"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { createPlaylist } from "@/app/business/content/actions";

export function CreatePlaylistDialog({
  open,
  onOpenChange,
  businessId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  function reset() {
    setName("");
    setDescription("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    const res = await createPlaylist({
      businessId,
      name: trimmed,
      description: description.trim(),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Playlist created.");
    onOpenChange(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Playlist</DialogTitle>
            <DialogDescription>Create an empty playlist, then add tracks from YouTube.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="create-playlist-name">Name</Label>
              <Input
                id="create-playlist-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Evening Vibes"
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-playlist-description">Description (Optional)</Label>
              <Textarea
                id="create-playlist-description"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
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
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create playlist"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
