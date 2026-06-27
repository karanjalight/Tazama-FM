import type { Metadata } from "next";

import { AuthHeading } from "@/components/auth/auth-heading";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password",
};

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading
        title="Reset your password"
        subtitle="We'll email you a link to set a new one."
      />
      <ForgotPasswordForm />
    </>
  );
}
