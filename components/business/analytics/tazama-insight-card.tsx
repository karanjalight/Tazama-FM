import { Sparkles } from "lucide-react";

import type { InsightCard } from "./data-engine";

export function TazamaInsightCard({ insight, onCta }: { insight: InsightCard; onCta?: () => void }) {
  return (
    <div className="rounded-2xl border border-violet-500/25 bg-violet-500/5 p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-violet-300 uppercase">
        <Sparkles className="size-3.5" />
        {insight.title}
      </p>
      <p className="mt-2 text-sm text-foreground">{insight.body}</p>
      {insight.ctaLabel && (
        <button
          type="button"
          onClick={onCta}
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/10 px-3.5 py-2 text-xs font-medium text-violet-300 transition-colors hover:bg-violet-500/20"
        >
          {insight.ctaLabel}
        </button>
      )}
    </div>
  );
}
