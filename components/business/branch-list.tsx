"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CreateBranchDialog } from "@/components/business/create-branch-dialog";
import type { Branch } from "@/lib/business/types";

export function BranchList({
  branches,
  canCreate,
}: {
  branches: Branch[];
  canCreate: boolean;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <div className="space-y-6">
      {canCreate && (
        <>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            Add branch
          </Button>
          <CreateBranchDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        </>
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
