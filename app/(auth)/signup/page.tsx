import type { Metadata } from "next";

import { AuthHeading } from "@/components/auth/auth-heading";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Join Tazama and start listening together.",
};

export default function SignupPage() {
  return (
    <>
      <AuthHeading
        title="Create your account"
        subtitle="Start listening together in under a minute."
      />
      <SignupForm />
    </>
  );
}
