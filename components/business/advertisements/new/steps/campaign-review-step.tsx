import type * as React from "react";

import { CREATIVES } from "../../mock-data";
import { totalScreensFor } from "../../types";
import type { CampaignDraft } from "../campaign-draft";
import { estimatedDelivery } from "../campaign-estimate";

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      {children}
    </div>
  );
}

function formatDate(d: string): string {
  return d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
}

export function CampaignReviewStep({ draft }: { draft: CampaignDraft }) {
  const screens = totalScreensFor(draft.roomIds);
  const { plays, reach } = estimatedDelivery(draft.budgetAmount);
  const libraryCreative = draft.creativeId ? CREATIVES.find((c) => c.id === draft.creativeId) : null;
  const creativeName = libraryCreative?.name ?? draft.uploadedCreative?.name ?? "No creative selected";
  const creativeDuration = libraryCreative?.durationLabel ?? draft.uploadedCreative?.durationLabel;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border p-4">
        <p className="text-lg font-semibold text-foreground">{draft.name || "Untitled Campaign"}</p>
        <p className="text-sm text-muted-foreground">
          {draft.advertiser} · {draft.objective}
        </p>
      </div>

      <SummarySection title="Creative">
        <p className="text-sm text-foreground">{creativeName}</p>
        {creativeDuration && <p className="text-sm text-muted-foreground">{creativeDuration}</p>}
      </SummarySection>

      <SummarySection title="Target">
        <p className="text-sm text-foreground">{draft.locationIds.length} location{draft.locationIds.length === 1 ? "" : "s"}</p>
        <p className="text-sm text-muted-foreground">{screens} screens</p>
      </SummarySection>

      <SummarySection title="Placement">
        <p className="text-sm text-foreground">{draft.placementType}</p>
        <p className="text-sm text-muted-foreground">{draft.frequency}</p>
      </SummarySection>

      <SummarySection title="Schedule">
        <p className="text-sm text-foreground">
          {formatDate(draft.startDate)} – {formatDate(draft.endDate)}
        </p>
        <p className="text-sm text-muted-foreground">
          {draft.activeStart} – {draft.activeEnd}
        </p>
      </SummarySection>

      <SummarySection title="Budget">
        <p className="text-sm text-foreground">KES {draft.budgetAmount.toLocaleString()}</p>
        <p className="text-sm text-muted-foreground capitalize">{draft.budgetType}</p>
      </SummarySection>

      <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
        <p className="mb-1 text-xs font-semibold text-violet-300">Estimated Delivery</p>
        <p className="text-sm text-foreground">~{plays.toLocaleString()} plays</p>
        <p className="text-sm text-foreground">~{reach.toLocaleString()} estimated reach</p>
      </div>
    </div>
  );
}
