import type { Metadata } from "next";

import { AuthHeading } from "@/components/auth/auth-heading";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Set a new password",
};

export default function ResetPasswordPage() {
  return (
    <>
      <AuthHeading
        title="Set a new password"
        subtitle="Choose a strong password you'll remember."
      />
      <ResetPasswordForm />
    </>
  );
}
