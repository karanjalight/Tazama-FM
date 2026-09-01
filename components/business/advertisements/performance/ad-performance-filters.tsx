import { AD_DATE_RANGES, type AdFilters } from "../data-engine";
import { ADVERTISERS, CAMPAIGNS } from "../mock-data";
import { TARGET_TREE } from "../types";
import { Select } from "@/components/ui/select";

const LOCATION_ITEMS = ["All Locations", ...TARGET_TREE.map((l) => l.name)] as const;
const CAMPAIGN_ITEMS = ["All Campaigns", ...CAMPAIGNS.map((c) => c.name)] as const;
const ADVERTISER_ITEMS = ["All Advertisers", ...ADVERTISERS] as const;

export function AdPerformanceFilters({ filters, onChange }: { filters: AdFilters; onChange: (patch: Partial<AdFilters>) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={filters.dateRange} onValueChange={(v) => onChange({ dateRange: v as AdFilters["dateRange"] })} items={AD_DATE_RANGES} className="h-9 w-36 rounded-lg text-sm" />
      <Select
        value={filters.locationId === "all" ? "All Locations" : (TARGET_TREE.find((l) => l.id === filters.locationId)?.name ?? "All Locations")}
        onValueChange={(v) => onChange({ locationId: v === "All Locations" ? "all" : (TARGET_TREE.find((l) => l.name === v)?.id ?? "all") })}
        items={LOCATION_ITEMS}
        className="h-9 w-40 rounded-lg text-sm"
      />
      <Select
        value={filters.campaignId === "all" ? "All Campaigns" : (CAMPAIGNS.find((c) => c.id === filters.campaignId)?.name ?? "All Campaigns")}
        onValueChange={(v) => onChange({ campaignId: v === "All Campaigns" ? "all" : (CAMPAIGNS.find((c) => c.name === v)?.id ?? "all") })}
        items={CAMPAIGN_ITEMS}
        className="h-9 w-44 rounded-lg text-sm"
      />
      <Select value={filters.advertiser} onValueChange={(v) => onChange({ advertiser: v })} items={ADVERTISER_ITEMS} className="h-9 w-44 rounded-lg text-sm" />
    </div>
  );
}
