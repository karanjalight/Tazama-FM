import { AD_RANGES, type AdRange } from "@/lib/business/ad-analytics-types";
import { Select } from "@/components/ui/select";

export interface AdPerformanceFilterValues {
  range: AdRange;
  locationId: string | null;
  campaignId: string | null;
  advertiser: string | null;
}

interface NamedOption {
  id: string;
  name: string;
}

/** Select items are labels, so duplicate names get a numeric suffix to stay unique. */
function labelled(options: NamedOption[]): { id: string; label: string }[] {
  const seen = new Map<string, number>();
  return options.map((o) => {
    const n = (seen.get(o.name) ?? 0) + 1;
    seen.set(o.name, n);
    return { id: o.id, label: n > 1 ? `${o.name} (${n})` : o.name };
  });
}

export function AdPerformanceFilters({
  filters,
  locations,
  campaigns,
  advertisers,
  onChange,
}: {
  filters: AdPerformanceFilterValues;
  locations: NamedOption[];
  campaigns: NamedOption[];
  advertisers: string[];
  onChange: (patch: Partial<AdPerformanceFilterValues>) => void;
}) {
  const locationItems = labelled(locations);
  const campaignItems = labelled(campaigns);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={filters.range} onValueChange={(v) => onChange({ range: v as AdRange })} items={AD_RANGES} className="h-9 w-36 rounded-lg text-sm" />
      <Select
        value={locationItems.find((l) => l.id === filters.locationId)?.label ?? "All Locations"}
        onValueChange={(v) => onChange({ locationId: locationItems.find((l) => l.label === v)?.id ?? null })}
        items={["All Locations", ...locationItems.map((l) => l.label)]}
        className="h-9 w-44 rounded-lg text-sm"
      />
      <Select
        value={campaignItems.find((c) => c.id === filters.campaignId)?.label ?? "All Campaigns"}
        onValueChange={(v) => onChange({ campaignId: campaignItems.find((c) => c.label === v)?.id ?? null })}
        items={["All Campaigns", ...campaignItems.map((c) => c.label)]}
        className="h-9 w-48 rounded-lg text-sm"
      />
      <Select
        value={filters.advertiser ?? "All Advertisers"}
        onValueChange={(v) => onChange({ advertiser: v === "All Advertisers" ? null : v })}
        items={["All Advertisers", ...advertisers]}
        className="h-9 w-44 rounded-lg text-sm"
      />
    </div>
  );
}
