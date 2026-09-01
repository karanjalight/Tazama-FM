import type { LucideIcon } from "lucide-react";

export function AnalyticsEmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  onCta,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-violet-500/15 text-violet-400">
        <Icon className="size-6" />
      </span>
      <div>
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {ctaLabel && (
        <button
          type="button"
          onClick={onCta}
          className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
