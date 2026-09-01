import { ANALYTICS_LOCATIONS, COMPARE_OPTIONS, DATE_RANGES, ROOMS_BY_ZONE, locationLabel, type AnalyticsFilters } from "./types";
import { Select } from "@/components/ui/select";

function zonesFor(locationId: string): string[] {
  if (locationId === "all") {
    const all = new Set<string>();
    ANALYTICS_LOCATIONS.forEach((l) => l.zones.forEach((z) => all.add(z)));
    return Array.from(all);
  }
  return ANALYTICS_LOCATIONS.find((l) => l.id === locationId)?.zones ?? [];
}

function roomsFor(zone: string): string[] {
  if (zone === "All Zones") return Object.values(ROOMS_BY_ZONE).flat();
  return ROOMS_BY_ZONE[zone] ?? [];
}

export function AnalyticsFiltersBar({
  filters,
  onChange,
  showCompare = true,
}: {
  filters: AnalyticsFilters;
  onChange: (patch: Partial<AnalyticsFilters>) => void;
  showCompare?: boolean;
}) {
  const zoneItems = ["All Zones", ...zonesFor(filters.locationId)] as const;
  const roomItems = ["All Rooms", ...roomsFor(filters.zone)] as const;
  const locationItems = ["All Locations", ...ANALYTICS_LOCATIONS.map((l) => l.name)] as const;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={filters.dateRange}
        onValueChange={(v) => onChange({ dateRange: v as AnalyticsFilters["dateRange"] })}
        items={DATE_RANGES}
        className="h-9 w-40 rounded-lg text-sm"
      />
      <Select
        value={locationLabel(filters.locationId)}
        onValueChange={(v) => {
          const id = v === "All Locations" ? "all" : (ANALYTICS_LOCATIONS.find((l) => l.name === v)?.id ?? "all");
          onChange({ locationId: id, zone: "All Zones", room: "All Rooms" });
        }}
        items={locationItems}
        className="h-9 w-40 rounded-lg text-sm"
      />
      <Select
        value={filters.zone}
        onValueChange={(v) => onChange({ zone: v, room: "All Rooms" })}
        items={zoneItems}
        className="h-9 w-36 rounded-lg text-sm"
      />
      <Select
        value={filters.room}
        onValueChange={(v) => onChange({ room: v })}
        items={roomItems}
        className="h-9 w-36 rounded-lg text-sm"
      />
      {showCompare && (
        <Select
          value={filters.compare}
          onValueChange={(v) => onChange({ compare: v as AnalyticsFilters["compare"] })}
          items={COMPARE_OPTIONS}
          className="h-9 w-40 rounded-lg text-sm"
        />
      )}
    </div>
  );
}
