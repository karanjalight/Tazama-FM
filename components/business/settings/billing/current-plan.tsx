"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  CURRENT_PLAN_FEATURES,
  NEXT_BILLING_DATE,
  PLAN_CATALOG,
  PLAN_ORDER,
  type PlanId,
} from "./mock-data";

const STATUS_LABEL: Record<"active" | "cancelled" | "past_due", string> = {
  active: "Active",
  cancelled: "Cancelled",
  past_due: "Past Due",
};

export function CurrentPlan({
  planId,
  status,
  onChangePlan,
}: {
  planId: PlanId;
  status: "active" | "cancelled" | "past_due";
  onChangePlan: (id: PlanId) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<PlanId>(planId);
  const plan = PLAN_CATALOG[planId];
  const isActive = status === "active";

  function handleOpenManage() {
    setSelected(planId);
    setOpen(true);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Current Plan</h2>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xl font-semibold text-foreground">{plan.name}</span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium",
                isActive ? "text-emerald-400" : "text-rose-400",
              )}
            >
              <span className={cn("size-1.5 rounded-full", isActive ? "bg-emerald-500" : "bg-rose-500")} />
              {STATUS_LABEL[status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{plan.price}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            Next billing date <span className="font-medium text-foreground">{NEXT_BILLING_DATE}</span>
          </p>
        </div>
        <Button type="button" variant="brand" onClick={handleOpenManage}>
          Manage Plan
        </Button>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-xs font-medium text-muted-foreground">Plan Features</p>
        <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
          {CURRENT_PLAN_FEATURES.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
              <Check className="size-4 shrink-0 text-emerald-400" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <ManagePlanDialog
        open={open}
        onOpenChange={setOpen}
        planId={planId}
        selected={selected}
        onSelectedChange={setSelected}
        onConfirm={onChangePlan}
      />
    </div>
  );
}

function ManagePlanDialog({
  open,
  onOpenChange,
  planId,
  selected,
  onSelectedChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: PlanId;
  selected: PlanId;
  onSelectedChange: (id: PlanId) => void;
  onConfirm: (id: PlanId) => void;
}) {
  function handleConfirm() {
    if (selected !== planId) {
      onConfirm(selected);
      toast.success(`Plan updated to ${PLAN_CATALOG[selected].name}`);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Plan</DialogTitle>
          <DialogDescription>Choose the plan that fits your business.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {PLAN_ORDER.map((id) => {
            const option = PLAN_CATALOG[id];
            const active = selected === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectedChange(id)}
                aria-pressed={active}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-colors outline-none",
                  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
                  active ? "border-brand bg-brand/5" : "border-border hover:bg-muted",
                )}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid size-4.5 shrink-0 place-items-center rounded-full border",
                      active ? "border-brand" : "border-input",
                    )}
                  >
                    {active && <Check className="size-3 text-brand" strokeWidth={3} />}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-foreground">{option.name}</span>
                    <span className="block text-xs text-muted-foreground">{option.tagline}</span>
                  </span>
                </span>
                <span className="shrink-0 text-sm font-medium text-foreground">{option.price}</span>
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="brand" onClick={handleConfirm}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
