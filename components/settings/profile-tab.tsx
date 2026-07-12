"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Phone, User } from "lucide-react";
import { toast } from "sonner";

import { Field } from "@/components/auth/field";
import {
  AccountTypeToggle,
  type AccountType,
} from "@/components/auth/account-type-toggle";
import { AvatarPicker } from "@/components/auth/avatar-picker";
import {
  BusinessFields,
  type BusinessValues,
} from "@/components/auth/business-fields";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { genericErrorMessage } from "@/lib/auth/messages";
import {
  businessDetailsSchema,
  validate,
  type FieldErrors,
} from "@/lib/auth/validation";
import type { CurrentProfile } from "@/lib/auth/profile";

const phoneRe = /^[+]?[\d\s().-]{7,20}$/;

export function ProfileTab({ profile }: { profile: CurrentProfile }) {
  const router = useRouter();

  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrors>({});

  const [fullName, setFullName] = React.useState(profile.fullName);
  const [phone, setPhone] = React.useState(profile.phone ?? "");
  const [accountType, setAccountType] = React.useState<AccountType>(
    profile.accountType ?? "individual",
  );
  const [avatarKey, setAvatarKey] = React.useState(profile.avatarKey ?? "");
  const [business, setBusiness] = React.useState<BusinessValues>({
    businessName: profile.business?.businessName ?? "",
    businessPhone: profile.business?.businessPhone ?? "",
    industry: profile.business?.industry ?? "",
  });

  const switchingType = accountType !== profile.accountType;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const next: FieldErrors = {};
    if (fullName.trim().length < 2) next.fullName = "Enter your full name.";
    if (phone.trim() && !phoneRe.test(phone.trim()))
      next.phone = "Enter a valid phone number.";
    if (accountType === "individual") {
      if (!avatarKey) next.avatar = "Pick an avatar.";
    } else {
      const r = validate(businessDetailsSchema, business);
      if (!r.success) Object.assign(next, r.errors);
    }
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    setErrors({});
    setLoading(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      toast.error("Your session expired. Please log in again.");
      return;
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      account_type: accountType,
      avatar_key: accountType === "individual" ? avatarKey : null,
      onboarding_complete: true,
    });
    if (profileError) {
      setLoading(false);
      toast.error(genericErrorMessage());
      return;
    }

    if (accountType === "business") {
      const { error: bizError } = await supabase
        .from("business_profiles")
        .upsert({
          id: user.id,
          business_name: business.businessName.trim(),
          business_phone: business.businessPhone.trim(),
          industry: business.industry,
        });
      if (bizError) {
        setLoading(false);
        toast.error(genericErrorMessage());
        return;
      }
    }

    setLoading(false);
    toast.success("Profile saved.");
    // Refresh server components (sidebar name/avatar reflect the change).
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update your identity and how you appear in rooms.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <Field
            id="fullName"
            label="Full name"
            placeholder="Amara Njoroge"
            icon={<User />}
            autoComplete="name"
            value={fullName}
            onValueChange={setFullName}
            error={errors.fullName}
            disabled={loading}
          />

          <Field
            id="phone"
            label="Phone"
            type="tel"
            inputMode="tel"
            optional
            placeholder="+254 700 000 000"
            icon={<Phone />}
            autoComplete="tel"
            value={phone}
            onValueChange={setPhone}
            error={errors.phone}
            disabled={loading}
          />

          <div className="space-y-2">
            <Label>Account type</Label>
            <AccountTypeToggle value={accountType} onChange={setAccountType} />
            {switchingType && (
              <p className="text-xs text-muted-foreground">
                Changing account type updates your profile. Your current plan
                stays active — manage billing under Subscriptions.
              </p>
            )}
          </div>

          {accountType === "individual" ? (
            <div className="space-y-2">
              <Label>Avatar</Label>
              <AvatarPicker
                value={avatarKey}
                onChange={setAvatarKey}
                error={errors.avatar}
              />
            </div>
          ) : (
            <BusinessFields
              values={business}
              onChange={(field, value) =>
                setBusiness((b) => ({ ...b, [field]: value }))
              }
              errors={errors}
              disabled={loading}
            />
          )}
        </CardContent>

        <CardFooter className="justify-end">
          <Button type="submit" variant="brand" size="pill" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? "Saving…" : "Save changes"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
