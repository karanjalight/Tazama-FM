import type * as React from "react";

import type { ContentItem } from "@/lib/business/content-queries";
import {
  coveredScreens,
  frequencyLabel,
  namesFor,
  type CampaignTargetOptions,
} from "@/lib/business/campaign-types";
import { draftTarget, type CampaignDraft } from "../campaign-draft";
import { DeliveryProjection } from "../delivery-projection";
import { formatClock, formatKes, formatShortDate } from "../../format";

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      {children}
    </div>
  );
}

export function CampaignReviewStep({
  draft,
  creatives,
  targetOptions,
}: {
  draft: CampaignDraft;
  creatives: ContentItem[];
  targetOptions: CampaignTargetOptions;
}) {
  const target = draftTarget(draft);
  const screens = coveredScreens(target, targetOptions);
  const creative = draft.creativeId ? (creatives.find((c) => c.id === draft.creativeId) ?? null) : null;
  const targetLabel =
    [
      ...namesFor(draft.locationIds, targetOptions.locations),
      ...namesFor(draft.zoneIds, targetOptions.zones),
      ...namesFor(draft.roomIds, targetOptions.rooms),
      ...namesFor(draft.screenIds, targetOptions.screens),
    ].join(", ") || "No target selected";

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border p-4">
        <p className="text-lg font-semibold text-foreground">{draft.name || "Untitled Campaign"}</p>
        <p className="text-sm text-muted-foreground">
          {draft.objective}
          {draft.advertiserName.trim() && ` · ${draft.advertiserName.trim()}`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SummarySection title="Creative">
          {creative ? (
            <>
              <p className="truncate text-sm text-foreground">{creative.title}</p>
              <p className="text-sm text-muted-foreground capitalize">
                {creative.contentType}
                {(creative.contentType === "image" || creative.contentType === "document") && ` · ${draft.displaySeconds}s on screen`}
              </p>
              {creative.status !== "approved" && (
                <p className="mt-1 text-xs text-amber-400">{creative.status} — won&apos;t air until approved</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No creative selected</p>
          )}
        </SummarySection>

        <SummarySection title="Target">
          <p className="line-clamp-2 text-sm text-foreground">{targetLabel}</p>
          <p className="text-sm text-muted-foreground">
            {screens.length} screen{screens.length === 1 ? "" : "s"}
          </p>
        </SummarySection>

        <SummarySection title="Placement">
          <p className="text-sm text-foreground">{draft.placementType}</p>
          <p className="text-sm text-muted-foreground">
            {frequencyLabel(draft.frequencyMinutes)} · {draft.maxPlaysPerDay > 0 ? `max ${draft.maxPlaysPerDay}/day` : "no daily limit"} ·{" "}
            {draft.priority} priority
          </p>
        </SummarySection>

        <SummarySection title="Schedule & Budget">
          <p className="text-sm text-foreground">
            {draft.startDate ? formatShortDate(draft.startDate) : "Now"} – {draft.endDate ? formatShortDate(draft.endDate) : "until paused"}
          </p>
          <p className="text-sm text-muted-foreground">
            {draft.activeStart || draft.activeEnd ? `${formatClock(draft.activeStart || "00:00")} – ${formatClock(draft.activeEnd || "00:00")}` : "All day"} ·{" "}
            {draft.budgetAmount > 0 ? `${formatKes(draft.budgetAmount)} ${draft.budgetType}` : "no budget cap"}
          </p>
        </SummarySection>
      </div>

      <DeliveryProjection draft={draft} targetOptions={targetOptions} />
    </div>
  );
}
