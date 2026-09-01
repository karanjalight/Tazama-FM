"use client";

import * as React from "react";
import Image from "next/image";
import { Store, Upload } from "lucide-react";

import { Field } from "@/components/auth/field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { BUSINESS_TYPES, type BusinessProfileState } from "./mock-data";

export function BusinessProfile({
  value,
  logoUrl,
  onChange,
  onLogoFile,
}: {
  value: BusinessProfileState;
  logoUrl: string | null;
  onChange: (patch: Partial<BusinessProfileState>) => void;
  onLogoFile: (file: File | undefined) => void;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div id="profile" className="scroll-mt-6 rounded-2xl border border-border bg-card p-6">
      <h2 className="text-base font-semibold text-foreground">Business Profile</h2>
      <p className="text-sm text-muted-foreground">
        Basic information about your business, shown across Tazama.
      </p>

      <div className="mt-5 flex items-center gap-4">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt=""
            width={64}
            height={64}
            unoptimized
            className="size-16 shrink-0 rounded-xl border border-border object-cover"
          />
        ) : (
          <div className="grid size-16 shrink-0 place-items-center rounded-xl border border-border bg-muted text-muted-foreground">
            <Store className="size-6" />
          </div>
        )}
        <div>
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload />
            Upload Logo
          </Button>
          <p className="mt-1.5 text-xs text-muted-foreground">PNG or JPG, up to 5MB</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onLogoFile(e.target.files?.[0])}
        />
      </div>

      <div className="mt-5 space-y-4">
        <Field
          id="business-name"
          label="Business Name"
          value={value.businessName}
          onValueChange={(v) => onChange({ businessName: v })}
        />

        <div className="space-y-1.5">
          <Label htmlFor="business-type">Business Type</Label>
          <Select
            id="business-type"
            value={value.businessType}
            onValueChange={(v) => onChange({ businessType: v })}
            items={BUSINESS_TYPES}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="business-description">Business Description</Label>
          <Textarea
            id="business-description"
            rows={3}
            value={value.description}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </div>

        <Field
          id="business-phone"
          label="Phone"
          type="tel"
          value={value.phone}
          onValueChange={(v) => onChange({ phone: v })}
        />

        <Field
          id="business-email"
          label="Email"
          type="email"
          value={value.email}
          onValueChange={(v) => onChange({ email: v })}
        />

        <Field
          id="business-website"
          label="Website"
          type="url"
          value={value.website}
          onValueChange={(v) => onChange({ website: v })}
        />
      </div>
    </div>
  );
}
