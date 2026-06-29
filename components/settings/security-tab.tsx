"use client";

import * as React from "react";
import { Loader2, LogOut, Mail } from "lucide-react";
import { toast } from "sonner";

import { Field } from "@/components/auth/field";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth/messages";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  validate,
  type FieldErrors,
} from "@/lib/auth/validation";

/* ------------------------------- password -------------------------------- */

function ChangePassword() {
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const r = validate(resetPasswordSchema, { password, confirm });
    if (!r.success) {
      setErrors(r.errors);
      return;
    }
    setErrors({});
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }
    setPassword("");
    setConfirm("");
    toast.success("Password updated.");
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            Use at least 8 characters. You’ll stay signed in on this device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PasswordField
            id="new-password"
            label="New password"
            value={password}
            onChange={setPassword}
            error={errors.password}
            autoComplete="new-password"
            disabled={loading}
            showStrength
          />
          <PasswordField
            id="confirm-password"
            label="Confirm new password"
            value={confirm}
            onChange={setConfirm}
            error={errors.confirm}
            autoComplete="new-password"
            disabled={loading}
          />
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" variant="brand" size="pill" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? "Updating…" : "Update password"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

/* --------------------------------- email --------------------------------- */

function ChangeEmail({ current }: { current: string | undefined }) {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const r = validate(forgotPasswordSchema, { email });
    if (!r.success) {
      setError(r.errors.email);
      return;
    }
    if (email.trim().toLowerCase() === (current ?? "").toLowerCase()) {
      setError("That’s already your email.");
      return;
    }
    setError(undefined);
    setLoading(true);
    const supabase = createClient();
    const { error: e2 } = await supabase.auth.updateUser({ email: email.trim() });
    setLoading(false);
    if (e2) {
      toast.error(authErrorMessage(e2));
      return;
    }
    setEmail("");
    toast.success("Check your inbox to confirm the new email.");
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Change email</CardTitle>
          <CardDescription>
            {current ? (
              <>
                Currently <span className="text-foreground">{current}</span>.
                We’ll email both addresses to confirm.
              </>
            ) : (
              "We’ll send a confirmation link to the new address."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field
            id="new-email"
            label="New email"
            type="email"
            inputMode="email"
            placeholder="you@example.com"
            icon={<Mail />}
            autoComplete="email"
            value={email}
            onValueChange={setEmail}
            error={error}
            disabled={loading}
          />
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" variant="brand" size="pill" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? "Sending…" : "Update email"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

/* --------------------------- sign out everywhere ------------------------- */

function SignOutEverywhere() {
  const [loading, setLoading] = React.useState(false);

  async function signOutOthers() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut({ scope: "others" });
    setLoading(false);
    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }
    toast.success("Signed out of your other devices.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign out everywhere else</CardTitle>
        <CardDescription>
          Revoke sessions on your other devices. This device stays signed in.
        </CardDescription>
      </CardHeader>
      <CardFooter className="justify-end">
        <Button
          type="button"
          variant="outline"
          size="pill"
          onClick={signOutOthers}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4" />
          )}
          {loading ? "Signing out…" : "Sign out other devices"}
        </Button>
      </CardFooter>
    </Card>
  );
}

export function SecurityTab({ email }: { email: string | undefined }) {
  return (
    <div className="space-y-6">
      <ChangePassword />
      <ChangeEmail current={email} />
      <SignOutEverywhere />
    </div>
  );
}
