import type { Metadata } from "next";

import { AuthHeading } from "@/components/auth/auth-heading";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to Tazama and jump back into the rooms.",
};

export default function LoginPage() {
  return (
    <>
      <AuthHeading
        title="Welcome back"
        subtitle="Log in to jump back into the rooms."
      />
      <LoginForm />
    </>
  );
}
