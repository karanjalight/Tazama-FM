"use client";

import * as React from "react";
import Image from "next/image";
import { Building2, ChevronDown, MapPin, Minus, Plus, UploadCloud, X, Locate } from "lucide-react";

import type { LocationDetailsForm } from "../wizard-data";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const TIMEZONES = [
  "East Africa Time (EAT)",
  "West Africa Time (WAT)",
  "Central Africa Time (CAT)",
  "South Africa Standard Time (SAST)",
] as const;

const COUNTRIES = ["Kenya", "Uganda", "Tanzania", "Rwanda", "Nigeria", "South Africa"] as const;

const MAP_LABELS = [
  { text: "Jamia Mosque", top: "22%", left: "68%" },
  { text: "Kencom House", top: "35%", left: "18%" },
  { text: "City Hall Way", top: "40%", left: "72%" },
  { text: "Tom Mboya Way", top: "58%", left: "62%" },
  { text: "Kimathi Street", top: "72%", left: "30%" },
  { text: "Moi Avenue", top: "82%", left: "76%" },
  { text: "Central Park", top: "70%", left: "8%" },
];

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

  function handleFile(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    onChange({ imageUrl: url });
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

          <Field id="loc-business" label="Business" required>
            <div
              id="loc-business"
              className="flex h-11 items-center justify-between gap-2 rounded-xl border border-input bg-background px-3.5 text-[15px] text-foreground"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-violet-500/20 text-violet-400">
                  <Building2 className="size-3.5" />
                </span>
                <span className="truncate">{details.business}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
                <X className="size-4" />
                <ChevronDown className="size-4" />
              </span>
            </div>
          </Field>
          <p className="-mt-3 text-xs text-muted-foreground">
            Select the business this location belongs to
          </p>

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
              {details.imageUrl && (
                <Image
                  src={details.imageUrl}
                  alt=""
                  width={96}
                  height={96}
                  unoptimized
                  className="size-24 shrink-0 rounded-xl border border-border object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-input py-5 text-center text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
              >
                <UploadCloud className="size-5" />
                <span className="text-xs font-medium">Upload Image</span>
                <span className="text-[11px]">PNG, JPG up to 5MB</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          </div>

          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={details.isActive}
              onChange={(e) => onChange({ isActive: e.target.checked })}
              className="mt-0.5 size-4 shrink-0 rounded border-input accent-brand"
            />
            <span>
              <span className="block text-sm text-foreground">This location is active</span>
              <span className="block text-xs text-muted-foreground">
                Inactive locations can be activated later
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Location on Map</h2>
          <p className="text-sm text-muted-foreground">Drag the pin to adjust the exact location</p>

          <div className="relative mt-3 h-56 overflow-hidden rounded-xl border border-border bg-[#0d1117]">
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />
            {MAP_LABELS.map((l) => (
              <span
                key={l.text}
                className="absolute text-[10px] whitespace-nowrap text-white/35"
                style={{ top: l.top, left: l.left }}
              >
                {l.text}
              </span>
            ))}
            <MapPin
              className="absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-full fill-violet-500 text-violet-500 drop-shadow-lg"
              strokeWidth={1.5}
            />
            <div className="absolute top-3 right-3 flex flex-col gap-1.5">
              <button
                type="button"
                aria-label="Zoom in"
                className="grid size-8 place-items-center rounded-lg border border-white/10 bg-black/50 text-white transition-colors hover:bg-black/70"
              >
                <Plus className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="Zoom out"
                className="grid size-8 place-items-center rounded-lg border border-white/10 bg-black/50 text-white transition-colors hover:bg-black/70"
              >
                <Minus className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="Locate"
                className="grid size-8 place-items-center rounded-lg border border-white/10 bg-black/50 text-white transition-colors hover:bg-black/70"
              >
                <Locate className="size-3.5" />
              </button>
            </div>
          </div>
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
