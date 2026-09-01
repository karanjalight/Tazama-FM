"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Integration } from "./mock-data";
import { ComingSoonBadge } from "./status-dot";

/** Purely informational "not a real connect flow" dialog for coming-soon integrations. */
export function LearnMoreDialog({
  integration,
  open,
  onOpenChange,
}: {
  integration: Integration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{integration?.name ?? "Integration"}</DialogTitle>
            <ComingSoonBadge />
          </div>
          <DialogDescription>
            We&apos;re preparing direct {integration?.name ?? "this integration"} connectivity for
            Tazama businesses. Use Notify Me on the card and we&apos;ll let you know the moment
            it&apos;s ready.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
