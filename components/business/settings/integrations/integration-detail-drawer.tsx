"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Integration } from "./mock-data";
import { StatusDot } from "./status-dot";

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm text-foreground">{children}</div>
    </div>
  );
}

/** Right-side "Manage" drawer for a connected integration. */
export function IntegrationDetailDrawer({
  integration,
  open,
  onOpenChange,
  onDisconnect,
}: {
  integration: Integration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDisconnect: (id: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{integration?.name ?? "Integration"}</SheetTitle>
          <SheetDescription>{integration?.categoryLabel ?? ""}</SheetDescription>
        </SheetHeader>

        {integration && (
          <>
            <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-4">
              <StatusDot label="Active" />

              <Separator />

              <div className="space-y-3">
                <DetailRow label="Connected">{integration.connectedAt}</DetailRow>
                <DetailRow label="Account">{integration.account}</DetailRow>
              </div>

              <Separator />

              <div>
                <p className="text-xs font-medium text-muted-foreground">Capabilities</p>
                <ul className="mt-2 space-y-1.5">
                  {(integration.capabilities ?? []).map((capability) => (
                    <li key={capability} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
                      {capability}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <SheetFooter className="flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() =>
                  toast.info(`${integration.name} settings are managed automatically — nothing to configure yet.`)
                }
              >
                Manage
              </Button>
              <Button
                type="button"
                variant="outline"
                className={cn("flex-1", "border-rose-500/30 text-rose-400 hover:bg-rose-500/10")}
                onClick={() => onDisconnect(integration.id)}
              >
                Disconnect
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
