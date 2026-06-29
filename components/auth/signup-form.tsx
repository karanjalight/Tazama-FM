"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Mail, Phone, User } from "lucide-react";
import { toast } from "sonner";

import { Field } from "./field";
import { PasswordField } from "./password-field";
import { AccountTypeToggle, type AccountType } from "./account-type-toggle";
import { AvatarPicker } from "./avatar-picker";
import { BusinessFields, type BusinessValues } from "./business-fields";
import { GenreSelect } from "./genre-select";
import { GoogleButton } from "./google-button";
import { AuthDivider } from "./auth-divider";
import { SubmitButton } from "./submit-button";
import { StepIndicator } from "./step-indicator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { DEMO_AUTH, makeDemoUser, saveDemoUser } from "@/lib/demo/demo-session";
import { authErrorMessage, genericErrorMessage } from "@/lib/auth/messages";
import {
  accountDetailsSchema,
  businessDetailsSchema,
  genrePreferencesSchema,
  validate,
  type FieldErrors,
} from "@/lib/auth/validation";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";

type Step = 1 | 2 | 3 | 4;

export function SignupForm() {
  const router = useRouter();
  const reduce = usePrefersReducedMotion();

  const [step, setStep] = React.useState<Step>(1);
  const [direction, setDirection] = React.useState<1 | -1>(1);
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrors>({});

  // step 1 — details
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");

  // step 2 — account type
  const [accountType, setAccountType] = React.useState<AccountType | "">("");

  // step 3 — avatar / business
  const [avatarKey, setAvatarKey] = React.useState("");
  const [business, setBusiness] = React.useState<BusinessValues>({
    businessName: "",
    businessPhone: "",
    industry: "",
  });

  // step 4 — genre preferences
  const [genres, setGenres] = React.useState<string[]>([]);

  function goTo(next: Step) {
    setDirection(next > step ? 1 : -1);
    setErrors({});
    setStep(next);
  }

  function continueFromDetails() {
    const result = validate(accountDetailsSchema, {
      fullName,
      email,
      phone,
      password,
    });
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    goTo(2);
  }

  function continueFromType() {
    if (!accountType) {
      setErrors({ accountType: "Choose an account type." });
      return;
    }
    goTo(3);
  }

  function continueFromProfile() {
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
    goTo(4);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step !== 4) return; // only the final step submits the form

    const genreResult = validate(genrePreferencesSchema, { genres });
    if (!genreResult.success) {
      setErrors(genreResult.errors);
      return;
    }

    setErrors({});
    setLoading(true);

    // Demo mode: simulate a successful signup (saved to localStorage), skip Supabase.
    if (DEMO_AUTH) {
      await new Promise((r) => setTimeout(r, 700));
      saveDemoUser(
        makeDemoUser({
          email: email.trim(),
          fullName: fullName.trim(),
          phone: phone.trim() || null,
          accountType: accountType as AccountType,
          avatarKey: accountType === "individual" ? avatarKey : null,
          genres,
          business:
            accountType === "business"
              ? {
                  businessName: business.businessName.trim(),
                  businessPhone: business.businessPhone.trim(),
                  industry: business.industry,
                }
              : undefined,
        }),
      );
      toast.success("Welcome to Tazama 🎉");
      router.push("/dashboard");
      router.refresh();
      return;
    }

    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), phone: phone.trim() || null },
      },
    });

    if (error) {
      setLoading(false);
      toast.error(authErrorMessage(error));
      if (/already/.test((error.message ?? "").toLowerCase())) {
        setDirection(-1);
        setStep(1);
        setErrors({ email: "This email is already registered." });
      }
      return;
    }

    // Email confirmation is disabled, so a session is returned immediately.
    if (!data.session || !data.user) {
      setLoading(false);
      toast("Almost there — check your email to confirm your account.");
      router.push("/login");
      return;
    }

    const userId = data.user.id;

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      account_type: accountType,
      avatar_key: accountType === "individual" ? avatarKey : null,
      genre_preferences: genres,
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
          id: userId,
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

    toast.success("Welcome to Tazama 🎉");
    router.push("/dashboard");
    router.refresh();
  }

  const motionProps = reduce
    ? {}
    : {
        initial: { opacity: 0, x: 24 * direction },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -24 * direction },
        transition: { duration: 0.26, ease: "easeOut" as const },
      };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <StepIndicator step={step} total={4} />

      <AnimatePresence mode="wait" initial={false}>
        {step === 1 && (
          <motion.div key="step1" {...motionProps} className="space-y-5">
            <GoogleButton label="Sign up with Google" />
            <AuthDivider />

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
              id="email"
              label="Email"
              type="email"
              inputMode="email"
              placeholder="you@example.com"
              icon={<Mail />}
              autoComplete="email"
              value={email}
              onValueChange={setEmail}
              error={errors.email}
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

            <PasswordField
              id="password"
              label="Password"
              value={password}
              onChange={setPassword}
              error={errors.password}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              showStrength
            />

            <SubmitButton type="button" onClick={continueFromDetails}>
              Continue
            </SubmitButton>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-foreground underline-offset-4 hover:underline"
              >
                Log in
              </Link>
            </p>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" {...motionProps} className="space-y-5">
            <div className="space-y-2">
              <Label>I’m signing up as</Label>
              <AccountTypeToggle value={accountType} onChange={setAccountType} />
              {errors.accountType && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.accountType}
                </p>
              )}
            </div>

            <div className="grid grid-cols-[auto_1fr] gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => goTo(1)}
                disabled={loading}
                className="h-11 rounded-xl px-4"
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <SubmitButton type="button" onClick={continueFromType}>
                Continue
              </SubmitButton>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" {...motionProps} className="space-y-5">
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

            <div className="grid grid-cols-[auto_1fr] gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => goTo(2)}
                disabled={loading}
                className="h-11 rounded-xl px-4"
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <SubmitButton type="button" onClick={continueFromProfile}>
                Continue
              </SubmitButton>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div key="step4" {...motionProps} className="space-y-5">
            <div className="space-y-2.5">
              <Label>Your sound</Label>
              <p className="text-sm text-muted-foreground">
                Pick the genres you love — we’ll tune your dashboard to them.
              </p>
              <GenreSelect
                value={genres}
                onChange={setGenres}
                error={errors.genres}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-[auto_1fr] gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => goTo(3)}
                disabled={loading}
                className="h-11 rounded-xl px-4"
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <SubmitButton loading={loading}>Create account</SubmitButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
