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
import { PLAN_CATALOG, PLAN_ORDER, type PlanId } from "./mock-data";

export function PlanComparison({
  planId,
  onChangePlan,
}: {
  planId: PlanId;
  onChangePlan: (id: PlanId) => void;
}) {
  const [pendingDowngrade, setPendingDowngrade] = React.useState(false);

  function handleChoose(id: PlanId) {
    if (id === "starter") {
      setPendingDowngrade(true);
      return;
    }
    onChangePlan(id);
    toast.success(`Plan updated to ${PLAN_CATALOG[id].name}`);
  }

  function handleContactSales() {
    toast.success("Thanks — our team will reach out shortly.");
  }

  function confirmDowngrade() {
    onChangePlan("starter");
    toast.success("Plan updated to Starter");
    setPendingDowngrade(false);
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-foreground">Compare Plans</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const plan = PLAN_CATALOG[id];
          const isCurrent = id === planId;
          const emphasized = id === "business";

          return (
            <div
              key={id}
              className={cn(
                "flex flex-col rounded-2xl border bg-card p-5",
                emphasized ? "border-brand ring-1 ring-brand" : "border-border",
              )}
            >
              <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
              <p className="mt-1 text-xl font-semibold text-foreground">{plan.price}</p>
              <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>

              <ul className="mt-4 flex-1 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="size-4 shrink-0 text-emerald-400" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {isCurrent ? (
                  <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-400">
                    <Check className="size-4" />
                    Current Plan
                  </span>
                ) : id === "enterprise" ? (
                  <Button type="button" variant="outline" className="w-full" onClick={handleContactSales}>
                    Contact Sales
                  </Button>
                ) : (
                  <Button type="button" variant="outline" className="w-full" onClick={() => handleChoose(id)}>
                    Choose {plan.name}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={pendingDowngrade} onOpenChange={setPendingDowngrade}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Downgrade to Starter?</DialogTitle>
            <DialogDescription>
              Some features and locations may be affected if they exceed the Starter plan&apos;s limits.
              You can switch back to Business at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingDowngrade(false)}>
              Cancel
            </Button>
            <Button type="button" variant="brand" onClick={confirmDowngrade}>
              Downgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
