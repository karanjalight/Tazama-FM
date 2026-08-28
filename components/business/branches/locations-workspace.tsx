"use client";

import * as React from "react";

import { MOCK_LOCATIONS } from "./mock-data";
import { LocationsTable } from "./locations-table";
import { LocationDetailPanel } from "./location-detail-panel";

export function LocationsWorkspace() {
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("All Status");
  const [business, setBusiness] = React.useState("All Business");
  const [selectedId, setSelectedId] = React.useState<string | null>(MOCK_LOCATIONS[0]?.id ?? null);

  const filtered = MOCK_LOCATIONS.filter((loc) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q || loc.name.toLowerCase().includes(q) || loc.address.toLowerCase().includes(q);
    const matchesStatus =
      status === "All Status" || (status === "Active" ? loc.status === "active" : loc.status === "offline");
    const matchesBusiness = business === "All Business" || loc.business === business;
    return matchesQuery && matchesStatus && matchesBusiness;
  });

  const selected = filtered.find((l) => l.id === selectedId) ?? null;

  return (
    <div className="grid items-start gap-4 xl:grid-cols-6">
      <div className="xl:col-span-4">
        <LocationsTable
          locations={filtered}
          total={MOCK_LOCATIONS.length}
          query={query}
          onQueryChange={setQuery}
          status={status}
          onStatusChange={setStatus}
          business={business}
          onBusinessChange={setBusiness}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>
      <div className="xl:col-span-2">
        {selected ? (
          <LocationDetailPanel location={selected} onClose={() => setSelectedId(null)} />
        ) : (
          <div className="grid place-items-center rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">Select a location to see its details.</p>
          </div>
        )}
      </div>
    </div>
  );
}
