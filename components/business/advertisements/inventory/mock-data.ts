/**
 * Network-wide ad inventory — deliberately a different, larger world than
 * TARGET_TREE (this business's own ~24-screen footprint used for campaign
 * targeting). Inventory represents "eligible business screens" across the
 * broader Tazama network per the brief's own product framing, including a
 * location (Ruiru) that doesn't exist anywhere else in the app. Numbers are
 * reconciled to the brief's headline KPIs (186 total / 142 available / 44
 * booked, 23.7% utilization) since its own worked location-level examples
 * didn't quite sum to those headlines.
 */
export interface InventoryZone {
  id: string;
  name: string;
  total: number;
  available: number;
}

export interface InventoryLocation {
  id: string;
  name: string;
  total: number;
  available: number;
  booked: number;
  zones: InventoryZone[];
}

export const INVENTORY_LOCATIONS: InventoryLocation[] = [
  {
    id: "nairobi-cbd",
    name: "Nairobi CBD",
    total: 54,
    available: 40,
    booked: 14,
    zones: [
      { id: "main-floor", name: "Main Floor", total: 24, available: 18 },
      { id: "rooftop", name: "Rooftop", total: 16, available: 12 },
      { id: "bar", name: "Bar", total: 14, available: 10 },
    ],
  },
  {
    id: "westlands",
    name: "Westlands",
    total: 44,
    available: 36,
    booked: 8,
    zones: [{ id: "main-floor", name: "Main Floor", total: 44, available: 36 }],
  },
  {
    id: "thika",
    name: "Thika",
    total: 40,
    available: 32,
    booked: 8,
    zones: [{ id: "main-floor", name: "Main Floor", total: 40, available: 32 }],
  },
  {
    id: "ruiru",
    name: "Ruiru",
    total: 48,
    available: 34,
    booked: 14,
    zones: [{ id: "main-floor", name: "Main Floor", total: 48, available: 34 }],
  },
];

export const TOTAL_INVENTORY_SCREENS = INVENTORY_LOCATIONS.reduce((s, l) => s + l.total, 0);
export const AVAILABLE_INVENTORY_SCREENS = INVENTORY_LOCATIONS.reduce((s, l) => s + l.available, 0);
export const BOOKED_INVENTORY_SCREENS = INVENTORY_LOCATIONS.reduce((s, l) => s + l.booked, 0);
export const UTILIZATION_PCT = Math.round((BOOKED_INVENTORY_SCREENS / TOTAL_INVENTORY_SCREENS) * 1000) / 10;

export type ScreenAvailability = "Available" | "Booked" | "Restricted";

export interface InventoryScreen {
  id: string;
  name: string;
  location: string;
  zone: string;
  availability: ScreenAvailability;
  indicativeCpm: number;
}

function seededPick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

export const INVENTORY_SCREENS: InventoryScreen[] = (() => {
  const rows: InventoryScreen[] = [];
  let counter = 1;
  for (const loc of INVENTORY_LOCATIONS) {
    let bookedRemaining = loc.booked;
    for (let i = 0; i < loc.total; i++) {
      const zone = loc.zones[i % loc.zones.length];
      let availability: ScreenAvailability = "Available";
      if (bookedRemaining > 0 && i % 3 === 0) {
        availability = "Booked";
        bookedRemaining--;
      } else if (i % 17 === 0 && i !== 0) {
        availability = "Restricted";
      }
      rows.push({
        id: `inv-${counter}`,
        name: `${loc.name.replace(/\s+/g, "").slice(0, 3).toUpperCase()}-TV-${String(i + 1).padStart(2, "0")}`,
        location: loc.name,
        zone: zone.name,
        availability,
        indicativeCpm: seededPick([90, 110, 120, 135, 150], counter),
      });
      counter++;
    }
  }
  return rows;
})();
