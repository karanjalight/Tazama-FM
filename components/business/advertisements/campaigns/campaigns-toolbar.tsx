import { Search } from "lucide-react";

import { CAMPAIGN_STATUSES, type CampaignTargetOptions } from "@/lib/business/campaign-types";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export interface CampaignFilters {
  query: string;
  status: string;
  location: string;
  advertiser: string;
}

export const DEFAULT_CAMPAIGN_FILTERS: CampaignFilters = {
  query: "",
  status: "All Status",
  location: "All Locations",
  advertiser: "All Advertisers",
};

const STATUS_ITEMS = ["All Status", ...CAMPAIGN_STATUSES] as const;

export function CampaignsToolbar({
  filters,
  targetOptions,
  advertisers,
  onChange,
}: {
  filters: CampaignFilters;
  targetOptions: CampaignTargetOptions;
  advertisers: string[];
  onChange: (patch: Partial<CampaignFilters>) => void;
}) {
  const locationItems = ["All Locations", ...targetOptions.locations.map((l) => l.name)];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-48 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.query}
          onChange={(e) => onChange({ query: e.target.value })}
          placeholder="Search campaigns or advertisers..."
          className="h-9 rounded-lg pl-9 text-sm"
        />
      </div>
      <Select value={filters.status} onValueChange={(v) => onChange({ status: v })} items={STATUS_ITEMS} className="h-9 w-36 rounded-lg text-sm" />
      <Select value={filters.location} onValueChange={(v) => onChange({ location: v })} items={locationItems} className="h-9 w-44 rounded-lg text-sm" />
      {advertisers.length > 0 && (
        <Select
          value={filters.advertiser}
          onValueChange={(v) => onChange({ advertiser: v })}
          items={["All Advertisers", ...advertisers]}
          className="h-9 w-44 rounded-lg text-sm"
        />
      )}
    </div>
  );
}
