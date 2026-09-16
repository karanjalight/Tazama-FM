"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { ArrowLeft, FileImage, FileText, Monitor, Music, Pause, Pencil, Play, Video } from "lucide-react";

import type { ContentItem } from "@/lib/business/content-queries";
import { setCampaignStatus, updateCampaign } from "@/app/business/advertisements/actions";
import {
  campaignDisplayStatus,
  coveredScreens,
  frequencyLabel,
  namesFor,
  type Campaign,
  type CampaignTargetOptions,
} from "@/lib/business/campaign-types";
import type { AdAnalytics, AdBreakdownRow, LiveAdAiring } from "@/lib/business/ad-analytics";
import { CampaignStatusPill } from "../campaign-status-pill";
import { CampaignActionsMenu } from "../campaign-actions-menu";
import { PlaysTodayCounter } from "../plays-today-counter";
import { AdsKpiCard } from "../ads-kpi-card";
import { AdsPerformanceChart } from "../ads-performance-chart";
import { EstimateInfo } from "../estimate-info";
import { OnAirNow } from "../on-air-now";
import { formatClock, formatCount, formatKes, formatShortDate, trendOf } from "../format";
import { useNow } from "../use-live-ad-status";
import { CreativePickerDialog } from "../new/steps/creative-picker-dialog";
import { useDialogTrigger } from "@/components/business/branches/new/use-dialog-trigger";
import { cn } from "@/lib/utils";

const TYPE_ICON = { video: Video, image: FileImage, audio: Music, document: FileText } as const;
const BREAKDOWNS = ["Locations", "Rooms", "Screens"] as const;

export function CampaignDetailView({
  campaign,
  today,
  canDelete,
  creative,
  creatives,
  targetOptions,
  analytics,
  playsToday,
  onAir,
  onBack,
  onEdit,
}: {
  campaign: Campaign;
  today: string;
  canDelete: boolean;
  creative: ContentItem | null;
  creatives: ContentItem[];
  targetOptions: CampaignTargetOptions;
  analytics: AdAnalytics | null;
  playsToday: number;
  onAir: LiveAdAiring[];
  onBack: () => void;
  onEdit: () => void;
}) {
  const router = useRouter();
  const creativePicker = useDialogTrigger("replace-creative");
  const [busy, setBusy] = React.useState(false);
  const [breakdown, setBreakdown] = React.useState<(typeof BREAKDOWNS)[number]>("Rooms");
  const now = useNow(false);

  const status = campaignDisplayStatus(campaign, today);
  const stats = analytics?.byCampaign[campaign.id];
  const totals = analytics?.totals;
  const screens = coveredScreens(campaign.target, targetOptions);
  const Icon = creative ? TYPE_ICON[creative.contentType] : Video;

  const hasDates = !!campaign.startDate && !!campaign.endDate;
  const start = hasDates ? Date.parse(`${campaign.startDate}T00:00:00`) : 0;
  const end = hasDates ? Date.parse(`${campaign.endDate}T23:59:59`) : 0;
  const timelinePct = now === null || !hasDates || end <= start ? 0 : Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));

  const todayRevenue = analytics?.daily.find((d) => d.date === today)?.revenue ?? 0;
  const budgetSpent = campaign.budgetType === "daily" ? todayRevenue : (totals?.revenue ?? 0);
  const budgetPct = campaign.budgetAmount ? Math.min(100, (budgetSpent / campaign.budgetAmount) * 100) : null;

  async function toggleStatus() {
    setBusy(true);
    const next = campaign.status === "Active" ? "Paused" : "Active";
    const res = await setCampaignStatus({ businessId: campaign.businessId, campaignId: campaign.id, status: next });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(next === "Active" ? "Campaign is live again." : "Campaign paused.");
    router.refresh();
  }

  async function handleReplaceCreative(newCreativeId: string) {
    setBusy(true);
    const res = await updateCampaign({ businessId: campaign.businessId, campaignId: campaign.id, creativeId: newCreativeId });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Creative replaced — the next airing uses it.");
    router.refresh();
  }

  const rows: AdBreakdownRow[] =
    breakdown === "Locations" ? (analytics?.byLocation ?? []) : breakdown === "Rooms" ? (analytics?.byRoom ?? []) : (analytics?.byScreen ?? []);

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Campaigns
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">{campaign.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <CampaignStatusPill status={status} />
            <span>·</span>
            <span>{campaign.advertiserName ?? "No advertiser"}</span>
            <span>·</span>
            <span>{campaign.objective}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EstimateInfo className="mr-1" />
          {campaign.status !== "Archived" && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-input px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Pencil className="size-4" /> Edit
            </button>
          )}
          {(campaign.status === "Active" || campaign.status === "Paused" || campaign.status === "Draft") && (
            <button
              type="button"
              disabled={busy}
              onClick={toggleStatus}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-input px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              {campaign.status === "Active" ? <Pause className="size-4" /> : <Play className="size-4" />}
              {campaign.status === "Active" ? "Pause" : campaign.status === "Draft" ? "Publish" : "Resume"}
            </button>
          )}
          <CampaignActionsMenu campaign={campaign} canDelete={canDelete} onEdit={onEdit} onDeleted={onBack} triggerClassName="size-10 border border-input" />
        </div>
      </div>

      {onAir.length > 0 && (
        <OnAirNow status={{ schemaReady: true, generatedAt: "", onAir, playsToday: {}, totalPlaysToday: playsToday, airingsToday: onAir.length }} />
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <div className="col-span-2 flex flex-col justify-center rounded-2xl border border-border bg-card p-4 sm:col-span-1">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Plays today</p>
          <PlaysTodayCounter count={playsToday} cap={campaign.maxPlaysPerDay} />
        </div>
        <AdsKpiCard label="Plays · 30d" value={formatCount(stats?.plays ?? 0)} trend={trendOf(totals?.plays ?? 0, analytics?.previous.plays ?? 0)} sublabel={`${formatCount(stats?.airings ?? 0)} airings`} />
        <AdsKpiCard label="Views · 30d" value={formatCount(stats?.views ?? 0)} estimated trend={trendOf(totals?.views ?? 0, analytics?.previous.views ?? 0)} />
        <AdsKpiCard label="Reach · 30d" value={formatCount(stats?.reach ?? 0)} estimated trend={trendOf(totals?.reach ?? 0, analytics?.previous.reach ?? 0)} />
        <AdsKpiCard label="Revenue · 30d" value={formatKes(stats?.revenue ?? 0)} estimated trend={trendOf(totals?.revenue ?? 0, analytics?.previous.revenue ?? 0)} />
        <AdsKpiCard label="Completion" value={stats?.plays ? `${stats.completionPct}%` : "—"} sublabel={`${formatCount(stats?.completed ?? 0)} played to the end`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Schedule</h2>
          {hasDates ? (
            <>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatShortDate(campaign.startDate)}</span>
                <span>{formatShortDate(campaign.endDate)}</span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-violet-500" style={{ width: `${timelinePct}%` }} />
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              {campaign.startDate ? `From ${formatShortDate(campaign.startDate)}` : "No dates set"} — runs until paused.
            </p>
          )}
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Active hours</dt>
              <dd className="text-foreground">
                {campaign.activeStartTime || campaign.activeEndTime
                  ? `${formatClock(campaign.activeStartTime ?? "00:00")} – ${formatClock(campaign.activeEndTime ?? "00:00")}`
                  : "All day"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Frequency</dt>
              <dd className="text-foreground">{frequencyLabel(campaign.frequencyMinutes)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Daily limit</dt>
              <dd className="text-foreground">{campaign.maxPlaysPerDay != null ? `${campaign.maxPlaysPerDay} airings/screen` : "No limit"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Priority · Placement</dt>
              <dd className="text-foreground">
                {campaign.priority} · {campaign.placementType}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Budget</h2>
          {campaign.budgetAmount ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatKes(budgetSpent)} estimated of {formatKes(campaign.budgetAmount)} {campaign.budgetType === "daily" ? "today" : "(last 30 days)"}
              </p>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", (budgetPct ?? 0) >= 100 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${budgetPct ?? 0}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {(budgetPct ?? 0) >= 100
                  ? "Budget reached — revenue stops counting past it, but the ad keeps airing."
                  : `${Math.round(budgetPct ?? 0)}% used · ${campaign.budgetType} budget`}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No budget cap — estimated revenue counts every view.</p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
            <div>
              <p className="font-mono font-semibold text-foreground">{formatKes(todayRevenue)}</p>
              <p className="text-xs text-muted-foreground">est. revenue today</p>
            </div>
            <div>
              <p className="font-mono font-semibold text-foreground">
                {stats?.plays ? formatKes((stats.revenue / Math.max(1, stats.views)) * 1000) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">effective CPM</p>
            </div>
          </div>
        </div>
      </div>

      <AdsPerformanceChart daily={analytics?.daily ?? []} title="Daily performance · 30d" />

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">Where it played · 30d</h2>
          <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1" role="tablist" aria-label="Breakdown">
            {BREAKDOWNS.map((b) => (
              <button
                key={b}
                type="button"
                role="tab"
                aria-selected={breakdown === b}
                onClick={() => setBreakdown(b)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  breakdown === b ? "bg-violet-600 text-white" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
        <BreakdownTable rows={rows} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Creative</h2>
          <div className="relative mt-3 aspect-video overflow-hidden rounded-xl bg-muted">
            {creative?.contentType === "video" && creative.url ? (
              <video src={creative.url} controls className="size-full object-cover" />
            ) : creative?.contentType === "image" && creative.previewUrl ? (
              <Image src={creative.previewUrl} alt="" fill sizes="500px" className="object-cover" unoptimized />
            ) : (
              <div className="grid h-full place-items-center bg-linear-to-br from-violet-500/20 to-fuchsia-500/20">
                <Icon className="size-8 text-foreground/40" />
              </div>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {creative?.title ?? "No creative selected"}
            {creative && ` · ${creative.contentType}`}
            {creative && (creative.contentType === "image" || creative.contentType === "document") && campaign.displaySeconds && ` · ${campaign.displaySeconds}s on screen`}
          </p>
          {creative && creative.status !== "approved" && (
            <p className="mt-1 text-xs text-amber-400">This creative is {creative.status} — the campaign won&apos;t air until it&apos;s approved.</p>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={creativePicker.show}
            className="mt-3 w-full rounded-xl border border-input py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            Replace Creative
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Targeting</h2>
          <div className="mt-3 space-y-3 text-sm">
            {(
              [
                ["Locations", namesFor(campaign.target.locationIds, targetOptions.locations)],
                ["Zones", namesFor(campaign.target.zoneIds, targetOptions.zones)],
                ["Rooms", namesFor(campaign.target.roomIds, targetOptions.rooms)],
                ["Screens", namesFor(campaign.target.screenIds, targetOptions.screens)],
              ] as const
            )
              .filter(([, names]) => names.length > 0)
              .map(([label, names]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-foreground">{names.join(", ")}</p>
                </div>
              ))}
          </div>
          <div className="mt-4 border-t border-border pt-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Monitor className="size-3.5" /> {screens.length} screen{screens.length === 1 ? "" : "s"} show this ad ·{" "}
              {screens.filter((s) => s.online).length} online
            </p>
            <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
              {screens.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs text-foreground">
                  <span className={cn("size-1.5 rounded-full", s.online ? "bg-emerald-500" : "bg-muted-foreground/50")} />
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <CreativePickerDialog
        key={creativePicker.dialogKey}
        open={creativePicker.open}
        onOpenChange={creativePicker.onOpenChange}
        creatives={creatives}
        onPick={handleReplaceCreative}
      />
    </div>
  );
}

function BreakdownTable({ rows }: { rows: AdBreakdownRow[] }) {
  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No plays in the last 30 days yet.</p>;
  }
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-150 text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Name</th>
            <th className="px-3 py-2 text-right font-medium">Plays</th>
            <th className="px-3 py-2 text-right font-medium">Airings</th>
            <th className="px-3 py-2 text-right font-medium">Est. Views</th>
            <th className="px-3 py-2 text-right font-medium">Est. Reach</th>
            <th className="px-3 py-2 text-right font-medium">Est. Revenue</th>
            <th className="py-2 pl-3 text-right font-medium">Completion</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/60 last:border-b-0">
              <td className="max-w-64 py-2.5 pr-3">
                <p className="truncate font-medium text-foreground">{r.name}</p>
                {r.context && <p className="truncate text-xs text-muted-foreground">{r.context}</p>}
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-foreground">{formatCount(r.plays)}</td>
              <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{formatCount(r.airings)}</td>
              <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{formatCount(r.views)}</td>
              <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{formatCount(r.reach)}</td>
              <td className="px-3 py-2.5 text-right font-mono text-foreground">{formatKes(r.revenue)}</td>
              <td className="py-2.5 pl-3 text-right font-mono text-emerald-400">{r.plays ? `${r.completionPct}%` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
