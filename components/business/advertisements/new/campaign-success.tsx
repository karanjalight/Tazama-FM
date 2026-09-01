import { Check } from "lucide-react";

import type { Campaign } from "../mock-data";
import { totalScreensFor } from "../types";
import { VioletButton } from "@/components/business/branches/new/violet-button";

export function CampaignSuccess({ campaign, onDone }: { campaign: Campaign; onDone: () => void }) {
  const screens = totalScreensFor(campaign.roomIds);

  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-400">
        <Check className="size-7" strokeWidth={2.5} />
      </span>
      <div>
        <p className="text-lg font-semibold text-foreground">Campaign Created</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {campaign.name} is now {campaign.status === "Active" ? "live" : "saved"} across {screens} screens.
        </p>
      </div>
      <VioletButton type="button" onClick={onDone} className="mt-1">
        Done
      </VioletButton>
    </div>
  );
}
