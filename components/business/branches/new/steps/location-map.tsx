"use client";

/**
 * Real, free map for Step 1 of the "Add Location" wizard — OpenStreetMap
 * tiles via Leaflet/react-leaflet, zero API key/billing/signup. Leaflet
 * touches `window`/`document` at import time, so this file must ONLY ever be
 * loaded on the client — see location-details-step.tsx, which loads it via
 * `next/dynamic(..., { ssr: false })` rather than importing it directly.
 */
import * as React from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { Loader2, Locate } from "lucide-react";
import { toast } from "sonner";

import "leaflet/dist/leaflet.css";

import { geocodeAddress } from "@/app/business/branches/new/geocode-actions";

// Leaflet's bundled default marker icon resolves its image URLs relative to
// a webpack/turbopack asset path that doesn't exist once bundled, so the pin
// renders as a broken image unless given explicit URLs. Rather than
// monkey-patching `L.Icon.Default.prototype` (the other common fix), build
// one explicit `L.icon()` and pass it to the Marker below — keeps this fully
// typed with no `any`/prototype surgery. Pinned to the installed leaflet
// version so the marker artwork always matches the library version in use.
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Nairobi, Kenya — reasonable default center for this business's operating
// region when the draft has no coordinates yet (never center on 0,0).
const DEFAULT_CENTER: [number, number] = [-1.286389, 36.817223];
const DEFAULT_ZOOM = 15;

/** Recenters/pans the map when `center` changes. Only mounted with a target
 * right after a successful "Locate" (see LocationMap below) — NOT on every
 * marker drag, so dragging the pin never fights the user by snapping the
 * view back to center after every move. */
function FlyToOnLocate({ center }: { center: [number, number] }) {
  const map = useMap();
  React.useEffect(() => {
    map.flyTo(center, map.getZoom());
    // Only re-run when the target coordinates actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1]]);
  return null;
}

export function LocationMap({
  latitude,
  longitude,
  address,
  city,
  country,
  onMarkerMove,
}: {
  latitude: number | null;
  longitude: number | null;
  address: string;
  city: string;
  country: string;
  onMarkerMove: (lat: number, lng: number) => void;
}) {
  const position: [number, number] =
    latitude != null && longitude != null ? [latitude, longitude] : DEFAULT_CENTER;

  const [locating, setLocating] = React.useState(false);
  const [flyTarget, setFlyTarget] = React.useState<[number, number] | null>(null);

  const markerRef = React.useRef<L.Marker>(null);
  const eventHandlers = React.useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (!marker) return;
        const { lat, lng } = marker.getLatLng();
        onMarkerMove(lat, lng);
      },
    }),
    [onMarkerMove],
  );

  async function handleLocate() {
    setLocating(true);
    try {
      const result = await geocodeAddress({ address, city, country });
      if (!result) {
        toast.error("Could not find that address. Try adding more detail.");
        return;
      }
      onMarkerMove(result.lat, result.lng);
      setFlyTarget([result.lat, result.lng]);
    } catch {
      toast.error("Could not look up that address right now.");
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className="relative mt-3 h-56 overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={position}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          position={position}
          icon={markerIcon}
          draggable
          eventHandlers={eventHandlers}
          ref={markerRef}
        />
        {flyTarget && <FlyToOnLocate center={flyTarget} />}
      </MapContainer>

      <button
        type="button"
        onClick={handleLocate}
        disabled={locating}
        className="absolute top-3 right-3 z-[1000] inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-black/60 px-2.5 text-xs font-medium text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/80 disabled:opacity-60"
      >
        {locating ? <Loader2 className="size-3.5 animate-spin" /> : <Locate className="size-3.5" />}
        Locate
      </button>
    </div>
  );
}
