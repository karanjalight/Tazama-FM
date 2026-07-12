"use client";

import * as React from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { toast } from "sonner";

import { Field } from "./field";
import { PasswordField } from "./password-field";
import { GoogleButton } from "./google-button";
import { AuthDivider } from "./auth-divider";
import { SubmitButton } from "./submit-button";
import { createClient } from "@/lib/supabase/client";
import { DEMO_AUTH, getDemoUser, saveDemoUser } from "@/lib/demo/demo-session";
import { authErrorMessage } from "@/lib/auth/messages";
import { navigateAfterAuth } from "@/lib/auth/navigate";
import { loginSchema, validate, type FieldErrors } from "@/lib/auth/validation";

export function LoginForm() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [loading, setLoading] = React.useState(false);

  // Surface an OAuth failure bounced back from /auth/callback.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) {
      const reason = params.get("reason");
      // The `reason` (e.g. provider not enabled / redirect not allowlisted) is
      // logged to help diagnose production OAuth config without leaking it in UI.
      if (reason) console.warn("[oauth] sign-in failed:", reason);
      toast.error("Google sign-in didn't complete. Please try again.");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validate(loginSchema, { email, password });
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setLoading(true);

    // Demo mode: "log in" against the account saved in localStorage at signup.
    if (DEMO_AUTH) {
      await new Promise((r) => setTimeout(r, 600));
      const account = getDemoUser();
      if (account && account.email.toLowerCase() === email.trim().toLowerCase()) {
        saveDemoUser(account); // re-open the session
        toast.success("Welcome back to Tazama");
        navigateAfterAuth("/dashboard");
        return;
      }
      setLoading(false);
      toast.error(
        account
          ? "That email or password doesn't look right."
          : "No account found — sign up first.",
      );
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setLoading(false);
      toast.error(authErrorMessage(error));
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", data.user.id)
      .single();

    toast.success("Welcome back to Tazama");
    navigateAfterAuth(profile?.onboarding_complete ? "/dashboard" : "/onboarding");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <GoogleButton />
      <AuthDivider />

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

      <div className="space-y-1.5">
        <PasswordField
          id="password"
          label="Password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          disabled={loading}
          autoComplete="current-password"
          placeholder="••••••••"
        />
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <SubmitButton loading={loading}>Log in</SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        New to Tazama?{" "}
        <Link
          href="/signup"
          className="font-semibold text-foreground underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
