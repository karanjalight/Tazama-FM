"use client";

import * as React from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Building2, Loader2, MapPin, UploadCloud } from "lucide-react";

import type { LocationDetailsForm } from "../wizard-data";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { uploadLocationImage } from "@/app/business/branches/new/actions";

// Leaflet touches `window`/`document` at import time (through react-leaflet),
// which breaks Next's server render — load the whole map as a client-only
// chunk. `ssr: false` is allowed here because this file itself is already a
// Client Component (top of file).
const LocationMap = dynamic(() => import("./location-map").then((m) => m.LocationMap), {
  ssr: false,
  loading: () => (
    <div className="mt-3 flex h-56 items-center justify-center rounded-xl border border-border bg-muted/40 text-xs text-muted-foreground">
      Loading map…
    </div>
  ),
});

const TIMEZONES = [
  "East Africa Time (EAT)",
  "West Africa Time (WAT)",
  "Central Africa Time (CAT)",
  "South Africa Standard Time (SAST)",
] as const;

const COUNTRIES = ["Kenya", "Uganda", "Tanzania", "Rwanda", "Nigeria", "South Africa"] as const;

const LOCATION_PHOTOS_BUCKET = "location-photos";

function Field({
  id,
  label,
  required,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-brand"> *</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function LocationDetailsStep({
  details,
  onChange,
}: {
  details: LocationDetailsForm;
  onChange: (patch: Partial<LocationDetailsForm>) => void;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  // Instant local preview (blob URL) shown the moment a file is picked, well
  // before the Storage upload round-trip resolves — never itself written to
  // the draft (blob URLs don't survive a reload). Once the upload finishes,
  // `details.imagePath` (the real Storage path) is what actually persists.
  const [preview, setPreview] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);

  // If this step is being resumed from a saved draft (no in-memory blob
  // preview to fall back on, since blob URLs don't survive a reload),
  // rebuild a viewable URL from the persisted Storage path — the bucket is
  // public, so this is a plain, predictable public-object URL, no signing
  // needed.
  const persistedImageUrl =
    details.imagePath && process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${LOCATION_PHOTOS_BUCKET}/${details.imagePath}`
      : null;
  const previewSrc = preview ?? persistedImageUrl;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    const res = await uploadLocationImage(formData);
    setUploading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    onChange({ imagePath: res.path });
  }

  function handleMarkerMove(lat: number, lng: number) {
    onChange({ latitude: lat, longitude: lng });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Location Details</h2>
        <p className="text-sm text-muted-foreground">Provide basic information about this location</p>

        <div className="mt-4 space-y-4">
          <Field id="loc-name" label="Location Name" required>
            <Input
              id="loc-name"
              value={details.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. Nairobi CBD"
            />
          </Field>
          <p className="-mt-3 text-xs text-muted-foreground">
            This will be the primary name for this location
          </p>

          <div className="space-y-1.5">
            <Label>Business</Label>
            <div className="flex h-11 items-center gap-2 rounded-xl border border-input bg-muted/40 px-3.5 text-[15px] text-foreground">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-violet-500/20 text-violet-400">
                <Building2 className="size-3.5" />
              </span>
              <span className="truncate">{details.business}</span>
            </div>
          </div>
          <p className="-mt-3 text-xs text-muted-foreground">This location belongs to {details.business}</p>

          <Field id="loc-address" label="Address" required>
            <div className="relative">
              <MapPin className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="loc-address"
                value={details.address}
                onChange={(e) => onChange({ address: e.target.value })}
                placeholder="Street address"
                className="pl-10"
              />
            </div>
          </Field>
          <p className="-mt-3 text-xs text-muted-foreground">Full address of the location</p>

          <div className="grid grid-cols-2 gap-3">
            <Field id="loc-city" label="City" required>
              <Input
                id="loc-city"
                value={details.city}
                onChange={(e) => onChange({ city: e.target.value })}
              />
            </Field>
            <Field id="loc-country" label="Country" required>
              <Select
                id="loc-country"
                value={details.country}
                onValueChange={(v) => onChange({ country: v })}
                items={COUNTRIES}
              />
            </Field>
          </div>

          <Field id="loc-timezone" label="Timezone" required>
            <Select
              id="loc-timezone"
              value={details.timezone}
              onValueChange={(v) => onChange({ timezone: v })}
              items={TIMEZONES}
            />
          </Field>
          <p className="-mt-3 text-xs text-muted-foreground">
            Timezone will be used for schedules and reporting
          </p>

          <Field id="loc-description" label="Description (Optional)">
            <Textarea
              id="loc-description"
              value={details.description}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={3}
            />
          </Field>
          <p className="-mt-3 text-xs text-muted-foreground">Brief description of this location</p>

          <div className="space-y-1.5">
            <Label>Location Image (Optional)</Label>
            <div className="flex gap-3">
              {previewSrc && (
                <div className="relative size-24 shrink-0">
                  <Image
                    src={previewSrc}
                    alt=""
                    width={96}
                    height={96}
                    unoptimized
                    className="size-24 rounded-xl border border-border object-cover"
                  />
                  {uploading && (
                    <div className="absolute inset-0 grid place-items-center rounded-xl bg-black/50">
                      <Loader2 className="size-5 animate-spin text-white" />
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-input py-5 text-center text-muted-foreground transition-colors hover:border-ring hover:text-foreground disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <UploadCloud className="size-5" />
                )}
                <span className="text-xs font-medium">{uploading ? "Uploading…" : "Upload Image"}</span>
                <span className="text-[11px]">PNG, JPG, WEBP up to 10MB</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Location on Map</h2>
          <p className="text-sm text-muted-foreground">
            Drag the pin, or use Locate to find it by address
          </p>

          <LocationMap
            latitude={details.latitude}
            longitude={details.longitude}
            address={details.address}
            city={details.city}
            country={details.country}
            onMarkerMove={handleMarkerMove}
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Location Settings</h2>
          <div
            className="mt-3 space-y-4"
            style={{ "--switch-accent": "var(--color-violet-600)" } as React.CSSProperties}
          >
            <ToggleRow
              label="Allow ads on this location"
              hint="Enable third-party advertisements on screens"
              checked={details.allowAds}
              onCheckedChange={(v) => onChange({ allowAds: v })}
            />
            <ToggleRow
              label="Allow announcements"
              hint="Enable audio and visual announcements"
              checked={details.allowAnnouncements}
              onCheckedChange={(v) => onChange({ allowAnnouncements: v })}
            />
            <ToggleRow
              label="Collect engagement data"
              hint="Allow Tazama to collect anonymous engagement data"
              checked={details.collectEngagementData}
              onCheckedChange={(v) => onChange({ collectEngagementData: v })}
            />
            <ToggleRow
              label="Restrict content by rating"
              hint="Only allow age-appropriate content"
              checked={details.restrictContentRating}
              onCheckedChange={(v) => onChange({ restrictContentRating: v })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
