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
import { cn } from "@/lib/utils";
import type { Integration } from "./mock-data";

/** Small confirm dialog reused by both the card's and the drawer's Disconnect button. */
export function DisconnectConfirmDialog({
  integration,
  open,
  onOpenChange,
  onConfirm,
  pending = false,
}: {
  integration: Integration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string) => void;
  pending?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disconnect {integration?.name ?? "integration"}?</DialogTitle>
          <DialogDescription>
            Tazama will stop syncing with {integration?.name ?? "this integration"}. You can
            reconnect at any time.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn("border-rose-500/30 text-rose-400 hover:bg-rose-500/10")}
            disabled={pending}
            onClick={() => {
              if (integration) onConfirm(integration.id);
            }}
          >
            {pending ? "Disconnecting…" : "Disconnect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
