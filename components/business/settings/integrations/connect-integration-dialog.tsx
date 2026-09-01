"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Integration } from "./mock-data";

/**
 * Controlled "Connect {name}" dialog for an unconnected, available
 * integration (Google, Longi). `integration` is null when the header
 * "+ Connect Integration" button is clicked but every available
 * integration is already connected — shown as a graceful empty state
 * rather than a broken/empty form.
 *
 * This is a deliberate stub, not real OAuth for any provider: the only
 * thing collected is a free-text account label, which
 * `connectIntegration()` records verbatim alongside a `connected_at`
 * timestamp. See supabase/business-settings.sql's header comment.
 */
export function ConnectIntegrationDialog({
  integration,
  open,
  onOpenChange,
  onConnect,
  pending = false,
}: {
  integration: Integration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (id: string, accountLabel: string) => void;
  pending?: boolean;
}) {
  const [accountLabel, setAccountLabel] = React.useState("");

  React.useEffect(() => {
    if (open) setAccountLabel("");
  }, [open]);

  const canConnect = accountLabel.trim().length > 0 && !pending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {integration ? (
          <>
            <DialogHeader>
              <DialogTitle>Connect {integration.name}</DialogTitle>
              <DialogDescription>
                This is a placeholder connection — Tazama doesn&apos;t perform a real{" "}
                {integration.name} sign-in yet. Give it a label so you can recognize it later.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <Label htmlFor="connect-account-label">Account name / label</Label>
              <Input
                id="connect-account-label"
                value={accountLabel}
                onChange={(e) => setAccountLabel(e.target.value)}
                placeholder={`e.g. ${integration.name} — Main Branch`}
                autoFocus
                maxLength={120}
              />
            </div>

            {integration.permissions && integration.permissions.length > 0 && (
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground">Permissions requested</p>
                <ul className="mt-2 space-y-1.5">
                  {integration.permissions.map((permission) => (
                    <li key={permission} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />
                      {permission}
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
                variant="brand"
                onClick={() => onConnect(integration.id, accountLabel.trim())}
                disabled={!canConnect}
              >
                {pending ? "Connecting…" : "Connect"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>No integrations available</DialogTitle>
              <DialogDescription>
                You&apos;re all caught up — every available integration is already connected.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
