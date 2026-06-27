import { cn } from "@/lib/utils";

/** "Step X of Y" with a thin brand progress bar. */
export function StepIndicator({
  step,
  total,
  className,
}: {
  step: number;
  total: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
        Step {step} of {total}
      </p>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              i < step ? "bg-brand" : "bg-border",
            )}
          />
        ))}
      </div>
    </div>
  );
}
