"use client";

import { campaignDisplayStatus, type Campaign } from "@/lib/business/campaign-types";
import type { AdCampaignStats } from "@/lib/business/ad-analytics";
import { CampaignStatusPill } from "./campaign-status-pill";
import { CampaignActionsMenu } from "./campaign-actions-menu";
import { PlaysTodayCounter } from "./plays-today-counter";
import { formatCount, formatKes } from "./format";

export function CampaignPerformanceTable({
  campaigns,
  stats,
  playsToday,
  today,
  canDelete,
  onView,
  onEdit,
}: {
  campaigns: Campaign[];
  stats: Record<string, AdCampaignStats>;
  /** Live counts (polled) — falls back to the server-rendered stats. */
  playsToday: Record<string, number>;
  today: string;
  canDelete: boolean;
  onView: (c: Campaign) => void;
  onEdit: (c: Campaign) => void;
}) {
  if (!campaigns.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No campaigns yet. Create one to start airing ads.</p>;
  }

  const rowProps = (c: Campaign) => ({
    role: "button" as const,
    tabIndex: 0,
    "aria-label": `View ${c.name}`,
    onClick: () => onView(c),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onView(c);
      }
    },
  });

  return (
    <div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Campaign</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Today</th>
              <th className="px-3 py-2 text-right font-medium">Plays</th>
              <th className="px-3 py-2 text-right font-medium">Est. Views</th>
              <th className="px-3 py-2 text-right font-medium">Est. Reach</th>
              <th className="px-3 py-2 text-right font-medium">Est. Revenue</th>
              <th className="px-3 py-2 text-right font-medium">Completion</th>
              <th className="py-2 pl-3 text-right font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => {
              const s = stats[c.id];
              return (
                <tr
                  key={c.id}
                  {...rowProps(c)}
                  className="cursor-pointer border-b border-border/60 last:border-b-0 hover:bg-muted/40 focus-visible:bg-muted/50 focus-visible:outline-none"
                >
                  <td className="max-w-56 py-2.5 pr-3">
                    <p className="truncate font-medium text-foreground">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.advertiserName ?? c.objective}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <CampaignStatusPill status={campaignDisplayStatus(c, today)} />
                  </td>
                  <td className="px-3 py-2.5">
                    <PlaysTodayCounter count={playsToday[c.id] ?? s?.playsToday ?? 0} cap={c.maxPlaysPerDay} compact />
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-foreground">{formatCount(s?.plays ?? 0)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{formatCount(s?.views ?? 0)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{formatCount(s?.reach ?? 0)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-foreground">{formatKes(s?.revenue ?? 0)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-emerald-400">{s?.plays ? `${s.completionPct}%` : "—"}</td>
                  <td className="py-2.5 pl-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <CampaignActionsMenu campaign={c} canDelete={canDelete} onView={() => onView(c)} onEdit={() => onEdit(c)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 sm:hidden">
        {campaigns.map((c) => {
          const s = stats[c.id];
          return (
            <div
              key={c.id}
              {...rowProps(c)}
              className="cursor-pointer rounded-xl border border-border/60 p-3 transition-colors hover:bg-muted/40 focus-visible:bg-muted/50 focus-visible:outline-none"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.advertiserName ?? c.objective}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <CampaignStatusPill status={campaignDisplayStatus(c, today)} />
                  <CampaignActionsMenu campaign={c} canDelete={canDelete} onView={() => onView(c)} onEdit={() => onEdit(c)} />
                </div>
              </div>
              <div className="mt-2">
                <PlaysTodayCounter count={playsToday[c.id] ?? s?.playsToday ?? 0} cap={c.maxPlaysPerDay} compact />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Plays</p>
                  <p className="font-mono text-foreground">{formatCount(s?.plays ?? 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Est. Reach</p>
                  <p className="font-mono text-muted-foreground">{formatCount(s?.reach ?? 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Est. Revenue</p>
                  <p className="font-mono text-foreground">{formatKes(s?.revenue ?? 0)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
