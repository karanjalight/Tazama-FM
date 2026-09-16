"use client";

import { Clock, Monitor } from "lucide-react";

import {
  campaignDisplayStatus,
  frequencyLabel,
  targetSummaryLabel,
  targetedScreenCount,
  type Campaign,
  type CampaignTargetOptions,
} from "@/lib/business/campaign-types";
import type { AdCampaignStats } from "@/lib/business/ad-analytics";
import { CampaignStatusPill } from "./campaign-status-pill";
import { CampaignActionsMenu } from "./campaign-actions-menu";
import { PlaysTodayCounter } from "./plays-today-counter";
import { formatClock, formatCount, formatKes, formatShortDate } from "./format";

export function CampaignCard({
  campaign,
  today,
  canDelete,
  targetOptions,
  stats,
  playsToday,
  onAir,
  onView,
  onEdit,
}: {
  campaign: Campaign;
  today: string;
  canDelete: boolean;
  targetOptions: CampaignTargetOptions;
  stats: AdCampaignStats | undefined;
  playsToday: number;
  onAir: boolean;
  onView: () => void;
  onEdit: () => void;
}) {
  const screens = targetedScreenCount(campaign.target, targetOptions);
  const dates =
    campaign.startDate || campaign.endDate
      ? `${campaign.startDate ? formatShortDate(campaign.startDate) : "Now"} – ${campaign.endDate ? formatShortDate(campaign.endDate) : "open"}`
      : "No end date";
  const hours =
    campaign.activeStartTime || campaign.activeEndTime
      ? `${formatClock(campaign.activeStartTime ?? "00:00")} – ${formatClock(campaign.activeEndTime ?? "00:00")}`
      : "All day";

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-foreground">{campaign.name}</p>
            {onAir && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-rose-400 uppercase">
                <span className="size-1.5 animate-pulse rounded-full bg-rose-500" /> On air
              </span>
            )}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {campaign.advertiserName ? `${campaign.advertiserName} · ` : ""}
            {campaign.objective}
          </p>
          <div className="mt-1">
            <CampaignStatusPill status={campaignDisplayStatus(campaign, today)} />
          </div>
        </div>
        <CampaignActionsMenu campaign={campaign} canDelete={canDelete} onView={onView} onEdit={onEdit} />
      </div>

      <div className="mt-3 rounded-xl bg-muted/30 px-3 py-2">
        <PlaysTodayCounter count={playsToday} cap={campaign.maxPlaysPerDay} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div>
          <p className="font-mono font-semibold text-foreground">{formatCount(stats?.plays ?? 0)}</p>
          <p className="text-xs text-muted-foreground">plays · 30d</p>
        </div>
        <div>
          <p className="font-mono font-semibold text-foreground">{formatCount(stats?.views ?? 0)}</p>
          <p className="text-xs text-muted-foreground">est. views</p>
        </div>
        <div>
          <p className="font-mono font-semibold text-foreground">{formatCount(stats?.reach ?? 0)}</p>
          <p className="text-xs text-muted-foreground">est. reach</p>
        </div>
        <div>
          <p className="font-mono font-semibold text-foreground">{formatKes(stats?.revenue ?? 0)}</p>
          <p className="text-xs text-muted-foreground">est. revenue</p>
        </div>
      </div>

      <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm text-muted-foreground">
        <p className="truncate text-foreground">{targetSummaryLabel(campaign.target, targetOptions)}</p>
        <p className="flex items-center gap-1.5">
          <Monitor className="size-3.5" /> {screens} screen{screens === 1 ? "" : "s"} · {frequencyLabel(campaign.frequencyMinutes).toLowerCase()}
        </p>
        <p className="flex items-center gap-1.5">
          <Clock className="size-3.5" /> {dates} · {hours}
        </p>
      </div>

      <button
        type="button"
        onClick={onView}
        className="mt-4 rounded-xl border border-input py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        View Campaign
      </button>
    </div>
  );
}
