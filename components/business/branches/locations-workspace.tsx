"use client";

import * as React from "react";

import type { LocationSummary } from "@/lib/business/locations-queries";
import { LocationsTable } from "./locations-table";
import { LocationDetailPanel } from "./location-detail-panel";

export function LocationsWorkspace({ locations }: { locations: LocationSummary[] }) {
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("All Status");
  const [selectedId, setSelectedId] = React.useState<string | null>(locations[0]?.id ?? null);

  const filtered = locations.filter((loc) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q || loc.name.toLowerCase().includes(q) || (loc.address ?? "").toLowerCase().includes(q);
    const matchesStatus =
      status === "All Status" || (status === "Active" ? loc.status === "active" : loc.status === "offline");
    return matchesQuery && matchesStatus;
  });

  const selected = filtered.find((l) => l.id === selectedId) ?? null;

  return (
    <div className="grid items-start gap-4 xl:grid-cols-6">
      <div className="xl:col-span-4">
        <LocationsTable
          locations={filtered}
          total={locations.length}
          query={query}
          onQueryChange={setQuery}
          status={status}
          onStatusChange={setStatus}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>
      <div className="xl:col-span-2">
        {selected ? (
          <LocationDetailPanel location={selected} onClose={() => setSelectedId(null)} />
        ) : (
          <div className="grid place-items-center rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {locations.length ? "Select a location to see its details." : "No locations yet — add your first one."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
