"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { createBranch } from "@/app/business/actions";
import { Button } from "@/components/ui/button";
import { GenrePicker } from "@/components/rooms/genre-picker";
import type { Branch } from "@/lib/business/types";

export function BranchList({
  branches,
  canCreate,
}: {
  branches: Branch[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [genres, setGenres] = React.useState<string[]>([]);
  const [pending, setPending] = React.useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setPending(true);
    const result = await createBranch({ name: name.trim(), genres });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setName("");
    setGenres([]);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {canCreate && (
        <form onSubmit={handleCreate} className="space-y-4 rounded-2xl border border-border bg-card p-4">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New branch name (e.g. Westlands)"
              className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <Button type="submit" disabled={pending || !name.trim()}>
              <Plus className="size-4" />
              Add branch
            </Button>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              What should this branch play?
            </p>
            <GenrePicker value={genres} onChange={setGenres} />
          </div>
        </form>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {branches.map((b) => (
          <Link
            key={b.id}
            href={`/business/branches/${b.id}`}
            className="rounded-2xl border border-border bg-card p-4 hover:border-foreground/20"
          >
            <p className="font-medium text-foreground">{b.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {b.devicePairedAt ? "Device paired" : "Not paired yet"}
            </p>
          </Link>
        ))}
        {!branches.length && (
          <p className="text-sm text-muted-foreground">
            No branches yet — add your first one above.
          </p>
        )}
      </div>
    </div>
  );
}
