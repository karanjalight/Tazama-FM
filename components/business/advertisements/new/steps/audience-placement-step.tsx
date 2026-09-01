import { Info, Plus } from "lucide-react";

import { FREQUENCY_OPTIONS, PLACEMENT_TYPES, totalScreensFor } from "../../types";
import type { CampaignDraft } from "../campaign-draft";
import { AdTargetSelector } from "./ad-target-selector";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PRIORITIES = ["Low", "Normal", "High", "Critical"] as const;

export function AudiencePlacementStep({ draft, onChange }: { draft: CampaignDraft; onChange: (patch: Partial<CampaignDraft>) => void }) {
  const screens = totalScreensFor(draft.roomIds);

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">Where should your advertisement appear?</p>
        <AdTargetSelector
          roomIds={draft.roomIds}
          onChange={(next) => onChange({ locationIds: next.locationIds, zoneIds: next.zoneIds, roomIds: next.roomIds })}
        />
        <p className="mt-2 text-sm font-medium text-foreground">{screens} screens selected</p>
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
                draft.placementType === type ? "border-violet-500 bg-violet-500/10 text-violet-300" : "border-border text-foreground hover:bg-muted/40",
              )}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Frequency</Label>
            <Select value={draft.frequency} onValueChange={(v) => onChange({ frequency: v })} items={FREQUENCY_OPTIONS} />
          </div>
          <div className="space-y-1.5">
            <Label>Maximum Plays</Label>
            <Input type="number" min={1} value={draft.maxPlaysPerDay} onChange={(e) => onChange({ maxPlaysPerDay: Number(e.target.value) || 0 })} />
            <p className="text-xs text-muted-foreground">plays/day/screen</p>
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={draft.priority} onValueChange={(v) => onChange({ priority: v as CampaignDraft["priority"] })} items={PRIORITIES} />
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Audience Signals</p>
          <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-violet-400 hover:text-violet-300">
            <Plus className="size-3.5" />
            Add Signal
          </button>
        </div>
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-muted/20 px-3.5 py-2.5 text-sm">
            <span className="text-muted-foreground">Time of day</span>
            <span className="font-medium text-foreground">
              {draft.activeStart} – {draft.activeEnd}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/20 px-3.5 py-2.5 text-sm">
            <span className="text-muted-foreground">Location activity</span>
            <span className="font-medium text-emerald-400">High</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/20 px-3.5 py-2.5 text-sm">
            <span className="text-muted-foreground">Audience activity</span>
            <span className="font-medium text-emerald-400">Above average</span>
          </div>
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          Audience signals are aggregate estimates and do not identify individual customers.
        </p>
      </div>
    </div>
  );
}
