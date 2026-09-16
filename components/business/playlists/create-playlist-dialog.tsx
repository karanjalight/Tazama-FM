"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { createPlaylist } from "@/app/business/content/actions";

export function CreatePlaylistDialog({
  open,
  onOpenChange,
  businessId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  /** `buildWithAi` → the caller opens the AI dialog on the new playlist,
   * seeded with `prompt` (its name + description). */
  onCreated?: (id: string, handoff: { buildWithAi: boolean; prompt: string }) => void;
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [buildWithAi, setBuildWithAi] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  function reset() {
    setName("");
    setDescription("");
    setBuildWithAi(true);
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
    onCreated?.(res.id, {
      buildWithAi,
      prompt: [trimmed, description.trim()].filter(Boolean).join(" — "),
    });
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
            <DialogDescription>Name your playlist, then let AI fill it or add tracks yourself.</DialogDescription>
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
                placeholder="e.g. Relaxed Afro-soul for weekday evenings"
              />
            </div>
            <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-violet-500/30 bg-violet-500/5 p-3">
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Sparkles className="size-3.5 text-violet-400" />
                  Build with AI
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Uses the name and description to suggest songs you can review before adding.
                </span>
              </span>
              <Switch
                checked={buildWithAi}
                onCheckedChange={setBuildWithAi}
                style={{ "--switch-accent": "var(--color-violet-600)" } as React.CSSProperties}
              />
            </label>
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
              {submitting ? "Creating…" : buildWithAi ? "Create & build with AI" : "Create playlist"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
