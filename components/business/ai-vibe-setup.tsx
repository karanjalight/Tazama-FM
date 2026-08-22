"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const MAX_DESCRIPTION_LENGTH = 300;

/**
 * "Describe your space, get matching genres" — feeds its result straight into
 * the branch's existing genre state (BranchDetail's `genres`/`setGenres`), so
 * saving still goes through the one existing path: GenrePicker + Save genres
 * -> updateBranchGenres. This panel never saves anything itself.
 */
export function AiVibeSetup({
  branchId,
  onGenres,
}: {
  branchId: string;
  onGenres: (genres: string[]) => void;
}) {
  const [description, setDescription] = React.useState("");
  const [note, setNote] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleGenerate() {
    const trimmed = description.trim();
    if (!trimmed) return;
    setPending(true);
    setNote(null);
    try {
      const res = await fetch("/api/business/ai-vibe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId, description: trimmed }),
      });
      const data = (await res.json()) as {
        genres?: string[];
        note?: string;
        error?: string;
      };

      if (data.error === "no_match") {
        toast.error("Couldn't match that to a genre — try describing it differently.");
        return;
      }
      if (!res.ok || data.error || !data.genres?.length) {
        toast.error("Couldn't reach the AI right now — try again.");
        return;
      }

      onGenres(data.genres);
      setNote(data.note ?? null);
      toast.success("Genres suggested below — review and save.");
    } catch {
      toast.error("Couldn't reach the AI right now — try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sparkles className="size-4 text-brand" />
        AI vibe setup
      </h2>
      <p className="text-sm text-muted-foreground">
        Describe your space in a sentence — Tazama matches it to genres below.
      </p>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={MAX_DESCRIPTION_LENGTH}
        rows={3}
        placeholder="Busy Nairobi café, upbeat afrobeats and amapiano through the day"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
      />
      <Button onClick={handleGenerate} disabled={pending || !description.trim()} size="sm">
        {pending ? "Matching…" : "Suggest genres"}
      </Button>
      {note && <p className="text-sm text-muted-foreground italic">&quot;{note}&quot;</p>}
    </section>
  );
}
