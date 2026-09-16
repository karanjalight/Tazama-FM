import { Check } from "lucide-react";

import { VioletButton } from "@/components/business/branches/new/violet-button";

export function CampaignSuccess({
  name,
  screens,
  draft,
  onDone,
}: {
  name: string;
  screens: number;
  draft: boolean;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
        <Check className="size-7" strokeWidth={2.5} />
      </span>
      <div>
        <p className="text-lg font-semibold text-foreground">{draft ? "Draft Saved" : "Campaign Created"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {draft
            ? `${name} is saved as a draft. Resume it from the Campaigns page when it's ready to air.`
            : `${name} is live across ${screens} screen${screens === 1 ? "" : "s"}. It takes over those screens whenever it's due, and every play is counted.`}
        </p>
      </div>
      <VioletButton type="button" onClick={onDone} className="mt-1">
        Done
      </VioletButton>
    </div>
  );
}
