import { MoreVertical } from "lucide-react";

import type { Campaign } from "./mock-data";
import { CampaignStatusPill } from "./campaign-status-pill";

export function CampaignPerformanceTable({ campaigns, onView }: { campaigns: Campaign[]; onView: (c: Campaign) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Campaign</th>
            <th className="px-3 py-2 font-medium">Advertiser</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 text-right font-medium">Plays</th>
            <th className="px-3 py-2 text-right font-medium">Reach</th>
            <th className="px-3 py-2 text-right font-medium">Completion</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="py-2 pl-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr
              key={c.id}
              role="button"
              tabIndex={0}
              aria-label={`View ${c.name}`}
              onClick={() => onView(c)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onView(c);
                }
              }}
              className="cursor-pointer border-b border-border/60 last:border-b-0 hover:bg-muted/40 focus-visible:bg-muted/50 focus-visible:outline-none"
            >
              <td className="py-2.5 pr-3 font-medium text-foreground">{c.name}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{c.advertiser}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{c.objective}</td>
              <td className="px-3 py-2.5 text-right font-mono text-foreground">{c.plays.toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{c.reach.toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right font-mono text-emerald-400">{c.completionPct}%</td>
              <td className="px-3 py-2.5">
                <CampaignStatusPill status={c.status} />
              </td>
              <td className="py-2.5 pl-3 text-right" onClick={(e) => e.stopPropagation()}>
                <button type="button" aria-label={`Actions for ${c.name}`} className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <MoreVertical className="size-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
