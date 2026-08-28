import { Check } from "lucide-react";

import { WIZARD_STEPS } from "./wizard-data";
import { cn } from "@/lib/utils";

export function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center rounded-2xl border border-border bg-card p-4">
      {WIZARD_STEPS.map((step, i) => {
        const isDone = step.id < currentStep;
        const isActive = step.id === currentStep;

        return (
          <div key={step.id} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full font-mono text-sm font-semibold",
                  isDone && "bg-emerald-500 text-white",
                  isActive && "bg-violet-600 text-white",
                  !isDone && !isActive && "border border-border text-muted-foreground",
                )}
              >
                {isDone ? <Check className="size-4" strokeWidth={3} /> : step.id}
              </span>
              <span className="hidden sm:block">
                <span
                  className={cn(
                    "block text-sm font-medium",
                    isActive ? "text-violet-400" : "text-foreground",
                  )}
                >
                  {step.label}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {isDone ? step.doneSublabel : step.activeSublabel}
                </span>
              </span>
            </div>
            {i < WIZARD_STEPS.length - 1 && (
              <div className="mx-3 h-0 min-w-6 flex-1 border-t border-dashed border-border sm:mx-4" />
            )}
          </div>
        );
      })}
    </div>
  );
}
