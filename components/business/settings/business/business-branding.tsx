"use client";

import * as React from "react";
import Image from "next/image";
import { Store, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SegmentedRadioGroup } from "./segmented-radio-group";
import { CONTENT_STYLES, type BusinessBrandingState } from "./mock-data";

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-11 shrink-0 rounded-xl border border-input bg-background p-1"
        />
        <span className="font-mono text-sm text-muted-foreground uppercase">{value}</span>
      </div>
    </div>
  );
}

export function BusinessBranding({
  value,
  logoUrl,
  onChange,
  onLogoFile,
}: {
  value: BusinessBrandingState;
  logoUrl: string | null;
  onChange: (patch: Partial<BusinessBrandingState>) => void;
  onLogoFile: (file: File | undefined) => void;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div id="branding" className="scroll-mt-6 rounded-2xl border border-border bg-card p-6">
      <h2 className="text-base font-semibold text-foreground">Business Branding</h2>
      <p className="text-sm text-muted-foreground">
        Colors and style applied to your customer-facing Tazama screens.
      </p>

      <div className="mt-5 space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ColorField
            id="brand-primary-color"
            label="Primary Brand Color"
            value={value.primaryColor}
            onChange={(v) => onChange({ primaryColor: v })}
          />
          <ColorField
            id="brand-secondary-color"
            label="Secondary Brand Color"
            value={value.secondaryColor}
            onChange={(v) => onChange({ secondaryColor: v })}
          />
        </div>

        <div className="flex items-center gap-4">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt=""
              width={56}
              height={56}
              unoptimized
              className="size-14 shrink-0 rounded-xl border border-border object-cover"
            />
          ) : (
            <div className="grid size-14 shrink-0 place-items-center rounded-xl border border-border bg-muted text-muted-foreground">
              <Store className="size-5" />
            </div>
          )}
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload />
              Change Logo
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onLogoFile(e.target.files?.[0])}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Default Content Style</Label>
          <div>
            <SegmentedRadioGroup
              name="content-style"
              options={CONTENT_STYLES}
              value={value.contentStyle}
              onChange={(v) => onChange({ contentStyle: v as BusinessBrandingState["contentStyle"] })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
