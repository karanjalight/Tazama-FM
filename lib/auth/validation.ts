import { z, type ZodType } from "zod";

const phoneRe = /^[+]?[\d\s().-]{7,20}$/;

/** Step 1 of signup — the personal account details. */
export const accountDetailsSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name."),
  email: z.email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || phoneRe.test(v), "Enter a valid phone number."),
  password: z.string().min(8, "Use at least 8 characters."),
});
export type AccountDetails = z.infer<typeof accountDetailsSchema>;

/** Step 2 (business) — the venue details. */
export const businessDetailsSchema = z.object({
  businessName: z.string().trim().min(2, "Enter your business name."),
  businessPhone: z
    .string()
    .trim()
    .refine((v) => phoneRe.test(v), "Enter a valid phone number."),
  industry: z.string().trim().min(1, "Pick your industry."),
});
export type BusinessDetails = z.infer<typeof businessDetailsSchema>;

/** Final signup step — at least one music genre must be chosen. */
export const genrePreferencesSchema = z.object({
  genres: z.array(z.string()).min(1, "Pick at least one genre to continue."),
});

export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address."),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match.",
    path: ["confirm"],
  });

export type FieldErrors = Record<string, string>;

/**
 * Validate `data` against a schema. Returns either the parsed value or a
 * flat `{ field: message }` map suitable for rendering under each input.
 */
export function validate<T>(
  schema: ZodType<T>,
  data: unknown,
):
  | { success: true; data: T }
  | { success: false; errors: FieldErrors } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };

  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !errors[key]) errors[key] = issue.message;
  }
  return { success: false, errors };
}
