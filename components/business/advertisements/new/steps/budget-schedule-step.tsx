import type { CampaignTargetOptions } from "@/lib/business/campaign-types";
import type { CampaignDraft } from "../campaign-draft";
import { DeliveryProjection } from "../delivery-projection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function BudgetScheduleStep({
  draft,
  targetOptions,
  onChange,
}: {
  draft: CampaignDraft;
  targetOptions: CampaignTargetOptions;
  onChange: (patch: Partial<CampaignDraft>) => void;
}) {
  const datesInvalid = !!draft.startDate && !!draft.endDate && draft.endDate < draft.startDate;

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">Campaign Budget</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(["total", "daily"] as const).map((type) => (
            <label
              key={type}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm",
                draft.budgetType === type ? "border-violet-500 bg-violet-500/10 text-violet-300" : "border-border text-foreground hover:bg-muted/40",
              )}
            >
              <input
                type="radio"
                name="budget-type"
                checked={draft.budgetType === type}
                onChange={() => onChange({ budgetType: type })}
                className="size-4 accent-violet-600"
              />
              {type === "total" ? "Total campaign budget" : "Daily budget"}
            </label>
          ))}
        </div>

        <div className="mt-3 space-y-1.5">
          <Label htmlFor="camp-budget">Budget (KES)</Label>
          <Input
            id="camp-budget"
            type="number"
            min={0}
            step={100}
            value={draft.budgetAmount || ""}
            placeholder="No budget cap"
            onChange={(e) => onChange({ budgetAmount: Math.max(0, Number(e.target.value) || 0) })}
          />
          <p className="text-xs text-muted-foreground">Estimated revenue never counts past this amount.</p>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <p className="mb-2 text-sm font-semibold text-foreground">Schedule</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="camp-start">Start</Label>
            <Input id="camp-start" type="date" value={draft.startDate} onChange={(e) => onChange({ startDate: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="camp-end">End</Label>
            <Input
              id="camp-end"
              type="date"
              value={draft.endDate}
              min={draft.startDate || undefined}
              aria-invalid={datesInvalid || undefined}
              onChange={(e) => onChange({ endDate: e.target.value })}
            />
          </div>
        </div>
        {datesInvalid && <p className="mt-1.5 text-xs text-rose-400">The end date can&apos;t be before the start date.</p>}

        <div className="mt-3 space-y-1.5">
          <Label>Active Hours</Label>
          <div className="grid grid-cols-2 gap-3">
            <Input type="time" aria-label="Start time" value={draft.activeStart} onChange={(e) => onChange({ activeStart: e.target.value })} />
            <Input type="time" aria-label="End time" value={draft.activeEnd} onChange={(e) => onChange({ activeEnd: e.target.value })} />
          </div>
          <p className="text-xs text-muted-foreground">
            In each location&apos;s own timezone. An end earlier than the start runs overnight. Leave both empty to run all day.
          </p>
        </div>
      </div>

      <DeliveryProjection draft={draft} targetOptions={targetOptions} />
    </div>
  );
}
