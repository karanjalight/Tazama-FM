"use client";

import { Field } from "@/components/auth/field";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { COUNTRIES, KENYAN_COUNTIES, type BusinessAddressState } from "./mock-data";

export function BusinessAddress({
  value,
  onChange,
}: {
  value: BusinessAddressState;
  onChange: (patch: Partial<BusinessAddressState>) => void;
}) {
  return (
    <div id="address" className="scroll-mt-6 rounded-2xl border border-border bg-card p-6">
      <h2 className="text-base font-semibold text-foreground">Business Address</h2>
      <p className="text-sm text-muted-foreground">Where this business is registered and based.</p>

      <div className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="address-country">Country</Label>
          <Select
            id="address-country"
            value={value.country}
            onValueChange={(v) => onChange({ country: v })}
            items={COUNTRIES}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address-county">County</Label>
          <Select
            id="address-county"
            value={value.county}
            onValueChange={(v) => onChange({ county: v })}
            items={KENYAN_COUNTIES}
          />
        </div>

        <Field
          id="address-city"
          label="City"
          value={value.city}
          onValueChange={(v) => onChange({ city: v })}
        />

        <Field
          id="address-street"
          label="Address"
          value={value.address}
          onValueChange={(v) => onChange({ address: v })}
        />

        <Field
          id="address-postal-code"
          label="Postal Code"
          value={value.postalCode}
          onValueChange={(v) => onChange({ postalCode: v })}
        />
      </div>
    </div>
  );
}
