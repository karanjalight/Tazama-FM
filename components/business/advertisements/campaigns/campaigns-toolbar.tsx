import { Search } from "lucide-react";

import { ADVERTISERS } from "../mock-data";
import { CAMPAIGN_STATUSES, TARGET_TREE } from "../types";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export interface CampaignFilters {
  query: string;
  status: string;
  advertiser: string;
  location: string;
}

export const DEFAULT_CAMPAIGN_FILTERS: CampaignFilters = {
  query: "",
  status: "All Status",
  advertiser: "All Advertisers",
  location: "All Locations",
};

const STATUS_ITEMS = ["All Status", ...CAMPAIGN_STATUSES] as const;
const ADVERTISER_ITEMS = ["All Advertisers", ...ADVERTISERS] as const;
const LOCATION_ITEMS = ["All Locations", ...TARGET_TREE.map((l) => l.name)] as const;

export function CampaignsToolbar({ filters, onChange }: { filters: CampaignFilters; onChange: (patch: Partial<CampaignFilters>) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={filters.query} onChange={(e) => onChange({ query: e.target.value })} placeholder="Search campaigns..." className="h-9 min-w-48 rounded-lg pl-9 text-sm" />
      </div>
      <Select value={filters.status} onValueChange={(v) => onChange({ status: v })} items={STATUS_ITEMS} className="h-9 w-36 rounded-lg text-sm" />
      <Select value={filters.advertiser} onValueChange={(v) => onChange({ advertiser: v })} items={ADVERTISER_ITEMS} className="h-9 w-44 rounded-lg text-sm" />
      <Select value={filters.location} onValueChange={(v) => onChange({ location: v })} items={LOCATION_ITEMS} className="h-9 w-40 rounded-lg text-sm" />
    </div>
  );
}
