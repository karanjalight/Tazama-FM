import { Search } from "lucide-react";

import { CATEGORIES, type TargetOption } from "./mock-data";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export interface AnnouncementFilters {
  query: string;
  category: string;
  status: string;
  location: string;
  playback: string;
}

export const DEFAULT_FILTERS: AnnouncementFilters = {
  query: "",
  category: "All Types",
  status: "All Status",
  location: "All Locations",
  playback: "All Playback Modes",
};

const TYPE_ITEMS = ["All Types", ...CATEGORIES] as const;
const STATUS_ITEMS = ["All Status", "Sent", "Scheduled", "Draft"] as const;
const PLAYBACK_ITEMS = ["All Playback Modes", "Pause Music", "Reduce Volume"] as const;

export function AnnouncementsToolbar({
  filters,
  locationOptions,
  onChange,
}: {
  filters: AnnouncementFilters;
  locationOptions: TargetOption[];
  onChange: (patch: Partial<AnnouncementFilters>) => void;
}) {
  const locationItems = ["All Locations", ...locationOptions.map((l) => l.name)];

  return (
    <div className="flex flex-wrap items-center gap-2 p-4">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.query}
          onChange={(e) => onChange({ query: e.target.value })}
          placeholder="Search announcements..."
          className="h-9 min-w-48 rounded-lg pl-9 text-sm"
        />
      </div>
      <Select value={filters.category} onValueChange={(v) => onChange({ category: v })} items={TYPE_ITEMS} className="h-9 w-36 rounded-lg text-sm" />
      <Select value={filters.status} onValueChange={(v) => onChange({ status: v })} items={STATUS_ITEMS} className="h-9 w-32 rounded-lg text-sm" />
      <Select value={filters.location} onValueChange={(v) => onChange({ location: v })} items={locationItems} className="h-9 w-40 rounded-lg text-sm" />
      <Select value={filters.playback} onValueChange={(v) => onChange({ playback: v })} items={PLAYBACK_ITEMS} className="h-9 w-44 rounded-lg text-sm" />
    </div>
  );
}
