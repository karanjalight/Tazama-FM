import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export const ANNOUNCEMENT_STEPS = [
  { id: 1, label: "Audio" },
  { id: 2, label: "Details" },
  { id: 3, label: "Target" },
  { id: 4, label: "Playback" },
  { id: 5, label: "Preview & Send" },
] as const;

export function AnnouncementStepIndicator({
  currentStep,
  onStepClick,
}: {
  currentStep: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {ANNOUNCEMENT_STEPS.map((step, i) => {
        const isDone = step.id < currentStep;
        const isActive = step.id === currentStep;
        const clickable = isDone;

        return (
          <div key={step.id} className="flex flex-1 items-center last:flex-none">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick(step.id)}
              className={cn("flex items-center gap-1.5", clickable && "cursor-pointer", !clickable && !isActive && "cursor-default")}
            >
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full font-mono text-[11px] font-semibold transition-colors",
                  isDone && "bg-emerald-500 text-white",
                  isActive && "bg-violet-600 text-white",
                  !isDone && !isActive && "border border-border text-muted-foreground",
                )}
              >
                {isDone ? <Check className="size-3" strokeWidth={3} /> : step.id}
              </span>
              <span className={cn("hidden text-xs font-medium sm:block", isActive ? "text-violet-400" : isDone ? "text-foreground" : "text-muted-foreground")}>
                {step.label}
              </span>
            </button>
            {i < ANNOUNCEMENT_STEPS.length - 1 && (
              <div className={cn("mx-2 h-0 min-w-4 flex-1 border-t", isDone ? "border-violet-500/50" : "border-dashed border-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
