import type { CampaignDraft } from "../campaign-draft";
import { estimatedDelivery } from "../campaign-estimate";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function BudgetScheduleStep({ draft, onChange }: { draft: CampaignDraft; onChange: (patch: Partial<CampaignDraft>) => void }) {
  const { plays, reach } = estimatedDelivery(draft.budgetAmount);

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">Campaign Budget</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className={cn("flex cursor-pointer items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm", draft.budgetType === "total" ? "border-violet-500 bg-violet-500/10 text-violet-300" : "border-border text-foreground hover:bg-muted/40")}>
            <input type="radio" name="budget-type" checked={draft.budgetType === "total"} onChange={() => onChange({ budgetType: "total" })} className="size-4 accent-violet-600" />
            Total campaign budget
          </label>
          <label className={cn("flex cursor-pointer items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm", draft.budgetType === "daily" ? "border-violet-500 bg-violet-500/10 text-violet-300" : "border-border text-foreground hover:bg-muted/40")}>
            <input type="radio" name="budget-type" checked={draft.budgetType === "daily"} onChange={() => onChange({ budgetType: "daily" })} className="size-4 accent-violet-600" />
            Daily budget
          </label>
        </div>

        <div className="mt-3 space-y-1.5">
          <Label htmlFor="camp-budget">Budget (KES)</Label>
          <Input id="camp-budget" type="number" min={0} step={100} value={draft.budgetAmount} onChange={(e) => onChange({ budgetAmount: Number(e.target.value) || 0 })} />
        </div>

        <div className="mt-3 rounded-xl bg-violet-500/10 p-3.5">
          <p className="text-xs font-medium text-violet-300">Estimated delivery</p>
          <p className="text-sm text-foreground">
            ~{plays.toLocaleString()} plays · ~{reach.toLocaleString()} estimated reach
          </p>
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
            <Input id="camp-end" type="date" value={draft.endDate} onChange={(e) => onChange({ endDate: e.target.value })} />
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          <Label>Active Hours</Label>
          <div className="grid grid-cols-2 gap-3">
            <Input type="time" value={draft.activeStart} onChange={(e) => onChange({ activeStart: e.target.value })} />
            <Input type="time" value={draft.activeEnd} onChange={(e) => onChange({ activeEnd: e.target.value })} />
          </div>
        </div>
      </div>
    </div>
  );
}
