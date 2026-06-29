"use client";

import * as React from "react";
import { toast } from "sonner";

import { PasswordField } from "./password-field";
import { SubmitButton } from "./submit-button";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth/messages";
import { navigateAfterAuth } from "@/lib/auth/navigate";
import {
  resetPasswordSchema,
  validate,
  type FieldErrors,
} from "@/lib/auth/validation";

export function ResetPasswordForm() {
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validate(resetPasswordSchema, { password, confirm });
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setLoading(false);
      toast.error(authErrorMessage(error));
      return;
    }

    toast.success("Password updated — you're signed in.");
    navigateAfterAuth("/dashboard");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <PasswordField
        id="password"
        label="New password"
        value={password}
        onChange={setPassword}
        error={errors.password}
        autoComplete="new-password"
        placeholder="At least 8 characters"
        showStrength
      />
      <PasswordField
        id="confirm"
        label="Confirm password"
        value={confirm}
        onChange={setConfirm}
        error={errors.confirm}
        autoComplete="new-password"
        placeholder="Re-enter your password"
      />
      <SubmitButton loading={loading}>Update password</SubmitButton>
    </form>
  );
}
