import Image from "next/image";
import { FileImage, FileText, Music, Video } from "lucide-react";

import type { ContentItem } from "@/lib/business/content-queries";
import type { Campaign } from "@/lib/business/campaign-types";
import type { AdCampaignStats } from "@/lib/business/ad-analytics";
import { formatCount, formatKes } from "./format";

const TYPE_ICON = { video: Video, image: FileImage, audio: Music, document: FileText } as const;

export function TopPerformingAds({
  campaigns,
  stats,
  creatives,
}: {
  campaigns: Campaign[];
  stats: Record<string, AdCampaignStats>;
  creatives: ContentItem[];
}) {
  const ranked = campaigns
    .map((c) => ({ campaign: c, stats: stats[c.id] }))
    .filter((r) => (r.stats?.plays ?? 0) > 0)
    .sort((a, b) => b.stats!.views - a.stats!.views || b.stats!.plays - a.stats!.plays)
    .slice(0, 5);

  if (!ranked.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Rankings appear once your ads start playing.</p>;
  }

  return (
    <div className="space-y-1">
      {ranked.map(({ campaign, stats: s }, i) => {
        const creative = campaign.creativeId ? creatives.find((cr) => cr.id === campaign.creativeId) : undefined;
        const Icon = creative ? TYPE_ICON[creative.contentType] : Video;
        return (
          <div key={campaign.id} className="flex items-center gap-3 rounded-xl px-1.5 py-2">
            <span className="w-5 shrink-0 text-center font-mono text-sm text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
            <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
              {creative?.previewUrl ? (
                <Image src={creative.previewUrl} alt="" fill sizes="44px" className="object-cover" unoptimized />
              ) : (
                <div className="grid h-full place-items-center bg-linear-to-br from-violet-500/20 to-fuchsia-500/20">
                  <Icon className="size-4 text-foreground/40" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{campaign.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {formatCount(s!.plays)} plays · {formatCount(s!.views)} est. views
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono text-sm font-semibold text-foreground">{formatKes(s!.revenue)}</p>
              <p className="text-[11px] text-emerald-400">{s!.completionPct}% complete</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
