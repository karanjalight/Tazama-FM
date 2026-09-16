"use client";

import { projectCampaignDelivery } from "@/lib/business/ad-estimates";
import { parseFrequencyMinutes } from "@/lib/business/ad-scheduling";
import { projectionRoomsFor, type CampaignTargetOptions } from "@/lib/business/campaign-types";
import { draftTarget, type CampaignDraft } from "./campaign-draft";
import { EstimateInfo } from "../estimate-info";
import { formatCount, formatKes } from "../format";
import { cn } from "@/lib/utils";

/** Live delivery projection from the draft's real targeted rooms, screens,
 * frequency, daily cap, hours, dates and budget. */
export function DeliveryProjection({
  draft,
  targetOptions,
  className,
}: {
  draft: CampaignDraft;
  targetOptions: CampaignTargetOptions;
  className?: string;
}) {
  const rooms = projectionRoomsFor(draftTarget(draft), targetOptions);
  const p = projectCampaignDelivery({
    rooms,
    frequencyMinutes: parseFrequencyMinutes(draft.frequencyMinutes),
    maxPlaysPerDay: draft.maxPlaysPerDay > 0 ? draft.maxPlaysPerDay : null,
    activeStart: draft.activeStart || null,
    activeEnd: draft.activeEnd || null,
    startDate: draft.startDate || null,
    endDate: draft.endDate || null,
    budget: { type: draft.budgetType, amount: draft.budgetAmount > 0 ? draft.budgetAmount : null },
  });
  const screens = rooms.reduce((sum, r) => sum + r.targetedPlayers, 0);

  return (
    <div className={cn("rounded-xl border border-violet-500/30 bg-violet-500/10 p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-violet-300">Projected delivery</p>
        <EstimateInfo />
      </div>

      {screens === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Pick screens with ads switched on to see a projection.</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted-foreground">
            {screens} screen{screens === 1 ? "" : "s"} in {rooms.length} room{rooms.length === 1 ? "" : "s"} · {p.airingsPerDay} airing
            {p.airingsPerDay === 1 ? "" : "s"} a day
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Plays / day" value={formatCount(p.playsPerDay)} />
            <Stat label="Views / day" value={formatCount(p.viewsPerDay)} />
            <Stat label="Reach / day" value={formatCount(p.reachPerDay)} />
            <Stat label="Revenue / day" value={formatKes(draft.budgetType === "daily" && draft.budgetAmount > 0 ? Math.min(p.revenuePerDay, draft.budgetAmount) : p.revenuePerDay)} />
          </div>
          <div className="mt-3 border-t border-violet-500/20 pt-3">
            <p className="text-xs text-muted-foreground">{p.openEnded ? "Per 30 days (no end date)" : `Over ${p.days} day${p.days === 1 ? "" : "s"}`}</p>
            <p className="mt-0.5 text-sm text-foreground">
              ~{formatCount(p.totalPlays)} plays · ~{formatCount(p.totalViews)} views · ~{formatCount(p.totalReach)} reach ·{" "}
              <span className="font-semibold">{formatKes(p.totalRevenue)}</span>
            </p>
            {p.budgetUsedPct !== null && (
              <div className="mt-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-violet-500/20">
                  <div className="h-full rounded-full bg-violet-500" style={{ width: `${p.budgetUsedPct}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {Math.round(p.budgetUsedPct)}% of the {draft.budgetType} budget
                  {p.budgetUsedPct >= 100 ? " — revenue is capped by the budget" : ""}
                </p>
              </div>
            )}
          </div>
        </>
      )}
      {p.airingsPerDay === 0 && screens > 0 && (
        <p className="mt-2 text-xs text-amber-400">Set a frequency and active hours long enough for at least one airing a day.</p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-base font-semibold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
