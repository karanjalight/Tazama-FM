"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name."),
  email: z.email("Enter a valid email address."),
  business: z.string().trim().max(120).optional(),
  message: z.string().trim().min(10, "Tell us a bit more about your space."),
});

export type ContactInput = z.infer<typeof contactSchema>;
export type ContactResult = { ok: true } | { ok: false; error: string };

export async function submitContactMessage(
  input: ContactInput,
): Promise<ContactResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check your details and try again.",
    };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false,
      error: "The contact form isn't set up yet — email us directly instead.",
    };
  }

  const { error } = await admin.from("contact_submissions").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    business: parsed.data.business || null,
    message: parsed.data.message,
  });

  if (error) {
    console.error("[contact] insert failed:", error.message);
    return { ok: false, error: "Something went wrong — please try again." };
  }

  return { ok: true };
}
