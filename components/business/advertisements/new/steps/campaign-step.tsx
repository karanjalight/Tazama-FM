import { CAMPAIGN_OBJECTIVES } from "../../types";
import type { CampaignDraft } from "../campaign-draft";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function CampaignStep({ draft, onChange }: { draft: CampaignDraft; onChange: (patch: Partial<CampaignDraft>) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="camp-name">
          Campaign Name <span className="text-rose-400">*</span>
        </Label>
        <Input id="camp-name" value={draft.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="e.g. Weekend Special" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="camp-advertiser">Advertiser</Label>
        <Input id="camp-advertiser" value={draft.advertiser} onChange={(e) => onChange({ advertiser: e.target.value })} placeholder="e.g. XYZ Restaurant" />
      </div>

      <div className="space-y-1.5">
        <Label>Campaign Objective</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CAMPAIGN_OBJECTIVES.map((obj) => (
            <label
              key={obj}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm",
                draft.objective === obj ? "border-violet-500 bg-violet-500/10 text-violet-300" : "border-border text-foreground hover:bg-muted/40",
              )}
            >
              <input type="radio" name="objective" checked={draft.objective === obj} onChange={() => onChange({ objective: obj })} className="size-4 accent-violet-600" />
              {obj}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
