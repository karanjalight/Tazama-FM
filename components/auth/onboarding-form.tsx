"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Phone, User } from "lucide-react";
import { toast } from "sonner";

import { Field } from "./field";
import { AccountTypeToggle, type AccountType } from "./account-type-toggle";
import { AvatarPicker } from "./avatar-picker";
import { BusinessFields, type BusinessValues } from "./business-fields";
import { SubmitButton } from "./submit-button";
import { StepIndicator } from "./step-indicator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { genericErrorMessage } from "@/lib/auth/messages";
import {
  businessDetailsSchema,
  validate,
  type FieldErrors,
} from "@/lib/auth/validation";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";

const phoneRe = /^[+]?[\d\s().-]{7,20}$/;

export function OnboardingForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const reduce = usePrefersReducedMotion();

  const [step, setStep] = React.useState<1 | 2>(1);
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrors>({});

  const [fullName, setFullName] = React.useState(initialName);
  const [phone, setPhone] = React.useState("");
  const [accountType, setAccountType] = React.useState<AccountType | "">("");

  const [avatarKey, setAvatarKey] = React.useState("");
  const [business, setBusiness] = React.useState<BusinessValues>({
    businessName: "",
    businessPhone: "",
    industry: "",
  });

  function continueToStep2() {
    const e: FieldErrors = {};
    if (fullName.trim().length < 2) e.fullName = "Enter your full name.";
    if (phone.trim() && !phoneRe.test(phone.trim()))
      e.phone = "Enter a valid phone number.";
    if (!accountType) e.accountType = "Choose an account type.";
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setErrors({});
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const stepErrors: FieldErrors = {};
    if (accountType === "individual") {
      if (!avatarKey) stepErrors.avatar = "Pick an avatar to continue.";
    } else {
      const r = validate(businessDetailsSchema, business);
      if (!r.success) Object.assign(stepErrors, r.errors);
    }
    if (Object.keys(stepErrors).length) {
      setErrors(stepErrors);
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
      router.push("/login");
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

    toast.success("You're all set 🎉");
    router.push("/dashboard");
    router.refresh();
  }

  const slide = (dir: 1 | -1) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, x: 24 * dir },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -24 * dir },
          transition: { duration: 0.28, ease: "easeOut" as const },
        };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <StepIndicator step={step} total={2} />

      <AnimatePresence mode="wait" initial={false}>
        {step === 1 ? (
          <motion.div key="step1" {...slide(1)} className="space-y-5">
            <Field
              id="fullName"
              label="Your name"
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
              <Label>I’m using Tazama as</Label>
              <AccountTypeToggle value={accountType} onChange={setAccountType} />
              {errors.accountType && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.accountType}
                </p>
              )}
            </div>

            <SubmitButton type="button" onClick={continueToStep2}>
              Continue
            </SubmitButton>
          </motion.div>
        ) : (
          <motion.div key="step2" {...slide(-1)} className="space-y-5">
            {accountType === "individual" ? (
              <div className="space-y-2">
                <Label>Choose your avatar</Label>
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

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setErrors({});
                  setStep(1);
                }}
                disabled={loading}
                className="h-11 rounded-xl px-4"
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <SubmitButton loading={loading}>Finish setup</SubmitButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
