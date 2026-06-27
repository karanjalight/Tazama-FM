"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Mail, MailCheck } from "lucide-react";
import { toast } from "sonner";

import { Field } from "./field";
import { SubmitButton } from "./submit-button";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth/messages";
import {
  forgotPasswordSchema,
  validate,
  type FieldErrors,
} from "@/lib/auth/validation";

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validate(forgotPasswordSchema, { email });
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }
    // Always show success to avoid leaking which emails exist.
    setSent(true);
    toast.success("Check your inbox for the reset link.");
  }

  if (sent) {
    return (
      <div className="space-y-5 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-live/10 text-live">
          <MailCheck className="size-6" />
        </span>
        <div className="space-y-1.5">
          <p className="text-[15px] font-medium text-foreground">
            Reset link on its way
          </p>
          <p className="text-sm text-muted-foreground">
            If an account exists for{" "}
            <span className="font-medium text-foreground">{email}</span>, you’ll
            get an email with a link to set a new password.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" /> Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field
        id="email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        icon={<Mail />}
        value={email}
        onValueChange={setEmail}
        error={errors.email}
        disabled={loading}
        autoFocus
      />
      <SubmitButton loading={loading}>Send reset link</SubmitButton>
      <p className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to log in
        </Link>
      </p>
    </form>
  );
}
