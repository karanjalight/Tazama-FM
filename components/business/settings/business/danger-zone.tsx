"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Lives outside the page's save/discard draft flow — this is a preview-only,
 * immediate-effect action gated by its own confirmation dialog, not a field
 * that gets batched into the shared save bar.
 */
export function DangerZone({ businessName }: { businessName: string }) {
  const [open, setOpen] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");

  const matches = confirmText.trim() === businessName.trim();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setConfirmText("");
  }

  function handleConfirmDelete() {
    if (!matches) return;
    toast.error("This is a preview — deletion is disabled.");
    handleOpenChange(false);
  }

  return (
    <div id="danger" className="scroll-mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/[0.03] p-5">
      <h2 className="text-base font-medium text-foreground">Delete Business</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Permanently remove this business and its Tazama configuration.
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-4 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
        onClick={() => setOpen(true)}
      >
        Delete Business
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {businessName}?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All screens, content and configuration for this
              business will be permanently removed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="delete-confirm-input">
              Type <span className="font-semibold text-foreground">{businessName}</span> to
              confirm
            </Label>
            <Input
              id="delete-confirm-input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              aria-describedby="delete-confirm-hint"
              autoComplete="off"
            />
            <p id="delete-confirm-hint" className="text-xs text-muted-foreground">
              This confirms you understand this permanently deletes the business.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
              disabled={!matches}
              onClick={handleConfirmDelete}
            >
              Delete Business
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
