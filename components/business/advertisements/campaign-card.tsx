import { MoreVertical } from "lucide-react";

import type { Campaign } from "./mock-data";
import { TARGET_TREE, totalScreensFor } from "./types";
import { CampaignStatusPill } from "./campaign-status-pill";

function formatDateRange(start: string, end: string): string {
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function CampaignCard({ campaign, onView }: { campaign: Campaign; onView: (c: Campaign) => void }) {
  const locationNames = TARGET_TREE.filter((l) => campaign.locationIds.includes(l.id)).map((l) => l.name);
  const screens = totalScreensFor(campaign.roomIds) || (campaign.locationIds.length > 0 ? "—" : 0);

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-foreground">{campaign.name}</p>
          <CampaignStatusPill status={campaign.status} />
        </div>
        <button type="button" aria-label={`Actions for ${campaign.name}`} className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <MoreVertical className="size-4" />
        </button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{campaign.advertiser}</p>

      <div className="my-3 border-t border-border" />

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="font-mono font-semibold text-foreground">{campaign.plays.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">plays</p>
        </div>
        <div>
          <p className="font-mono font-semibold text-foreground">{campaign.reach.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">estimated reach</p>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-emerald-400">{campaign.completionPct}% completion</p>

      <div className="mt-3 space-y-0.5 text-sm text-muted-foreground">
        <p className="text-foreground">{locationNames.join(", ") || "No target set"}</p>
        <p>{screens} screens</p>
        <p>{formatDateRange(campaign.startDate, campaign.endDate)}</p>
      </div>

      <button
        type="button"
        onClick={() => onView(campaign)}
        className="mt-4 rounded-xl border border-input py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        View Campaign
      </button>
    </div>
  );
}
