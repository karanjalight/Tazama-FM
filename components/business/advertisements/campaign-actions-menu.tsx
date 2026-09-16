"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Eye, MoreVertical, Pause, Pencil, Play, Trash2 } from "lucide-react";

import { deleteCampaign, setCampaignStatus } from "@/app/business/advertisements/actions";
import type { Campaign } from "@/lib/business/campaign-types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const itemClass =
  "flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none select-none data-highlighted:bg-muted";

/** The ⋮ menu on campaign cards, table rows and the detail header. */
export function CampaignActionsMenu({
  campaign,
  canDelete,
  onView,
  onEdit,
  onDeleted,
  triggerClassName,
}: {
  campaign: Campaign;
  canDelete: boolean;
  onView?: () => void;
  onEdit?: () => void;
  onDeleted?: () => void;
  triggerClassName?: string;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function changeStatus(status: Campaign["status"], success: string) {
    setBusy(true);
    const res = await setCampaignStatus({ businessId: campaign.businessId, campaignId: campaign.id, status });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(success);
    router.refresh();
  }

  async function handleDelete() {
    setBusy(true);
    const res = await deleteCampaign({ businessId: campaign.businessId, campaignId: campaign.id });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setConfirmOpen(false);
    toast.success(`${campaign.name} deleted.`);
    onDeleted?.();
    router.refresh();
  }

  const canPause = campaign.status === "Active";
  const canResume = campaign.status === "Paused" || campaign.status === "Draft" || campaign.status === "Completed";

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          aria-label={`Actions for ${campaign.name}`}
          disabled={busy}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50",
            triggerClassName,
          )}
        >
          <MoreVertical className="size-4" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={4} align="end" className="z-50 outline-none">
            <Menu.Popup
              onClick={(e) => e.stopPropagation()}
              className="min-w-44 origin-(--transform-origin) rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lift transition-[opacity,transform] data-ending-style:scale-98 data-ending-style:opacity-0 data-starting-style:scale-98 data-starting-style:opacity-0"
            >
              {onView && (
                <Menu.Item className={itemClass} onClick={onView}>
                  <Eye className="size-4 text-muted-foreground" /> View details
                </Menu.Item>
              )}
              {onEdit && campaign.status !== "Archived" && (
                <Menu.Item className={itemClass} onClick={onEdit}>
                  <Pencil className="size-4 text-muted-foreground" /> Edit campaign
                </Menu.Item>
              )}
              {canPause && (
                <Menu.Item className={itemClass} onClick={() => changeStatus("Paused", "Campaign paused.")}>
                  <Pause className="size-4 text-muted-foreground" /> Pause
                </Menu.Item>
              )}
              {canResume && (
                <Menu.Item className={itemClass} onClick={() => changeStatus("Active", "Campaign is live again.")}>
                  <Play className="size-4 text-muted-foreground" /> Resume
                </Menu.Item>
              )}
              {campaign.status === "Archived" ? (
                <Menu.Item className={itemClass} onClick={() => changeStatus("Paused", "Campaign restored as paused.")}>
                  <ArchiveRestore className="size-4 text-muted-foreground" /> Restore
                </Menu.Item>
              ) : (
                <Menu.Item className={itemClass} onClick={() => changeStatus("Archived", "Campaign archived.")}>
                  <Archive className="size-4 text-muted-foreground" /> Archive
                </Menu.Item>
              )}
              {canDelete && (
                <>
                  <Menu.Separator className="my-1 h-px bg-border" />
                  <Menu.Item className={cn(itemClass, "text-rose-400")} onClick={() => setConfirmOpen(true)}>
                    <Trash2 className="size-4" /> Delete
                  </Menu.Item>
                </>
              )}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Delete {campaign.name}?</DialogTitle>
            <DialogDescription>
              It stops airing immediately and its performance history is removed from Advertising reports. Archive it
              instead to keep the numbers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="rounded-xl border border-input px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleDelete}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Delete campaign"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
