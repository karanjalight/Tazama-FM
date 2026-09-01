import { Check } from "lucide-react";

import { WIZARD_STEPS } from "./wizard-data";
import { cn } from "@/lib/utils";

export function ScheduleStepIndicator({
  currentStep,
  onStepClick,
}: {
  currentStep: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="flex items-center rounded-2xl border border-border bg-card p-4">
      {WIZARD_STEPS.map((step, i) => {
        const isDone = step.id < currentStep;
        const isActive = step.id === currentStep;
        const clickable = isDone;

        return (
          <div key={step.id} className="flex flex-1 items-center last:flex-none">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick(step.id)}
              className={cn(
                "flex items-center gap-3 rounded-lg text-left",
                clickable && "cursor-pointer",
                !clickable && !isActive && "cursor-default",
              )}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full font-mono text-sm font-semibold transition-colors",
                  isDone && "bg-emerald-500 text-white group-hover:bg-emerald-400",
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
                    isActive ? "text-violet-400" : isDone ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
                <span className="block text-xs text-muted-foreground">{step.sublabel}</span>
              </span>
            </button>
            {i < WIZARD_STEPS.length - 1 && (
              <div className={cn("mx-3 h-0 min-w-6 flex-1 border-t sm:mx-4", isDone ? "border-violet-500/50" : "border-dashed border-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
