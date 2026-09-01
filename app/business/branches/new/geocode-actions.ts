"use server";

/**
 * Free, no-API-key geocoding for the "Add Location" wizard's map (Step 1).
 * Uses OpenStreetMap's Nominatim search endpoint — the whole point of this
 * map integration is zero signup/zero billing, so no paid geocoder here.
 *
 * Runs server-side rather than being called from the browser: Nominatim's
 * usage policy (https://operations.osmfoundation.org/policies/nominatim/)
 * requires a descriptive User-Agent identifying the calling application,
 * which a bare client-side `fetch` can't reliably set (and is more likely to
 * get rate-limited/blocked without). No auth/viewer check — this is a pure
 * lookup with no data mutation, unlike the rest of this directory's actions.
 */

export interface GeocodeResult {
  lat: number;
  lng: number;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Tazama Business Dashboard (location wizard geocoding; contact: support@tazama.app)";

export async function geocodeAddress(input: {
  address?: string;
  city?: string;
  country?: string;
}): Promise<GeocodeResult | null> {
  const parts = [input.address, input.city, input.country]
    .map((p) => (p ?? "").trim())
    .filter(Boolean);
  const query = parts.join(", ").trim();
  if (!query) return null;

  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      // Geocoding results for a typed address are looked up fresh each time,
      // not cached by Next's data cache.
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data = (await res.json()) as unknown;
    if (!Array.isArray(data) || data.length === 0) return null;

    const first = data[0] as { lat?: unknown; lon?: unknown };
    const lat = typeof first.lat === "string" ? Number.parseFloat(first.lat) : NaN;
    const lng = typeof first.lon === "string" ? Number.parseFloat(first.lon) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
  } catch (err) {
    console.error("geocodeAddress failed", err);
    return null;
  }
}
