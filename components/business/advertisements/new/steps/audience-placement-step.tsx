import { Info } from "lucide-react";

import {
  CAMPAIGN_PRIORITIES,
  FREQUENCY_OPTIONS,
  PLACEMENT_TYPES,
  coveredScreens,
  type CampaignTargetOptions,
} from "@/lib/business/campaign-types";
import { draftTarget, type CampaignDraft } from "../campaign-draft";
import { AdTargetSelector } from "./ad-target-selector";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function AudiencePlacementStep({
  draft,
  targetOptions,
  onChange,
}: {
  draft: CampaignDraft;
  targetOptions: CampaignTargetOptions;
  onChange: (patch: Partial<CampaignDraft>) => void;
}) {
  const target = draftTarget(draft);
  const screens = coveredScreens(target, targetOptions);
  const online = screens.filter((s) => s.online).length;
  const frequencyLabel =
    FREQUENCY_OPTIONS.find((f) => f.minutes === draft.frequencyMinutes)?.label ?? `Every ${draft.frequencyMinutes} minutes`;

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-1 text-sm font-semibold text-foreground">Where should your advertisement appear?</p>
        <p className="mb-2 text-xs text-muted-foreground">
          Pick whole locations, zones or rooms, or open a room to pick individual screens.
        </p>
        {targetOptions.locations.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            No locations set up yet — add one under Locations first.
          </p>
        ) : (
          <>
            <AdTargetSelector
              target={target}
              options={targetOptions}
              onChange={(next) =>
                onChange({ locationIds: next.locationIds, zoneIds: next.zoneIds, roomIds: next.roomIds, screenIds: next.screenIds })
              }
            />
            <p className="mt-2 text-sm font-medium text-foreground">
              {screens.length} screen{screens.length === 1 ? "" : "s"} will show this ad
              <span className="font-normal text-muted-foreground"> · {online} online now</span>
            </p>
          </>
        )}
      </div>

      <div className="border-t border-border pt-4">
        <p className="mb-2 text-sm font-semibold text-foreground">Placement</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PLACEMENT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onChange({ placementType: type })}
              className={cn(
                "rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition-colors",
                draft.placementType === type
                  ? "border-violet-500 bg-violet-500/10 text-violet-300"
                  : "border-border text-foreground hover:bg-muted/40",
              )}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Frequency</Label>
            <Select
              value={frequencyLabel}
              onValueChange={(v) => {
                const match = FREQUENCY_OPTIONS.find((f) => f.label === v);
                if (match) onChange({ frequencyMinutes: match.minutes });
              }}
              items={FREQUENCY_OPTIONS.map((f) => f.label)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="camp-max-plays">Maximum Plays</Label>
            <Input
              id="camp-max-plays"
              type="number"
              min={0}
              value={draft.maxPlaysPerDay || ""}
              placeholder="No limit"
              onChange={(e) => onChange({ maxPlaysPerDay: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
            />
            <p className="text-xs text-muted-foreground">airings/day per screen</p>
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select
              value={draft.priority}
              onValueChange={(v) => onChange({ priority: v as CampaignDraft["priority"] })}
              items={[...CAMPAIGN_PRIORITIES]}
            />
          </div>
        </div>
      </div>

      <p className="flex items-start gap-1.5 rounded-lg bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        When it&apos;s due, the ad takes over the chosen screens, whatever they&apos;re playing: music, a playlist or a
        schedule. Video and audio ads pause the music when they cover every screen in a zone, and it resumes exactly where
        it left off. If two campaigns are due at once, the higher priority airs first.
      </p>
    </div>
  );
}
