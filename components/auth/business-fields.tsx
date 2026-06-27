"use client";

import { Building2, Phone } from "lucide-react";

import { Field } from "./field";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { industries } from "@/lib/auth/industries";
import type { FieldErrors } from "@/lib/auth/validation";

export interface BusinessValues {
  businessName: string;
  businessPhone: string;
  industry: string;
}

export function BusinessFields({
  values,
  onChange,
  errors,
  disabled,
}: {
  values: BusinessValues;
  onChange: (field: keyof BusinessValues, value: string) => void;
  errors: FieldErrors;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <Field
        id="businessName"
        label="Business name"
        placeholder="Sunset Lounge"
        icon={<Building2 />}
        value={values.businessName}
        onValueChange={(v) => onChange("businessName", v)}
        error={errors.businessName}
        disabled={disabled}
        autoComplete="organization"
      />

      <Field
        id="businessPhone"
        label="Business phone"
        type="tel"
        inputMode="tel"
        placeholder="+254 700 000 000"
        icon={<Phone />}
        value={values.businessPhone}
        onValueChange={(v) => onChange("businessPhone", v)}
        error={errors.businessPhone}
        disabled={disabled}
        autoComplete="tel"
      />

      <div className="space-y-1.5">
        <Label htmlFor="industry">Industry</Label>
        <Select
          id="industry"
          value={values.industry}
          onValueChange={(v) => onChange("industry", v)}
          items={industries}
          placeholder="Select your industry"
          invalid={!!errors.industry}
        />
        {errors.industry && (
          <p role="alert" className="text-xs text-destructive">
            {errors.industry}
          </p>
        )}
      </div>
    </div>
  );
}
