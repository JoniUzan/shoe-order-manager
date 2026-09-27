import { z } from "zod";

export const LOCALES = ["he", "en"] as const;
export const THEMES = ["light", "dark", "system"] as const;

export type LocaleCode = (typeof LOCALES)[number];
export type ThemeCode = (typeof THEMES)[number];

/** Minimum length for a new password. */
export const PASSWORD_MIN = 8;

export const profileSchema = z.object({
  name: z.string().trim().min(1, { message: "required" }).max(100),
  email: z.string().trim().toLowerCase().email({ message: "email" }).max(200),
  // Required by the action only when the email changes.
  currentPassword: z.string().max(200).optional().or(z.literal("")),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, { message: "required" }).max(200),
    newPassword: z
      .string()
      .min(PASSWORD_MIN, { message: "passwordTooShort" })
      .max(200),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "passwordMismatch",
    path: ["confirmPassword"],
  });

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

export const preferencesSchema = z.object({
  locale: z.enum(LOCALES),
  theme: z.enum(THEMES),
});

export type PreferencesInput = z.infer<typeof preferencesSchema>;

export const businessSchema = z.object({
  businessName: z.string().trim().max(200).optional().or(z.literal("")),
  businessPhone: z.string().trim().max(50).optional().or(z.literal("")),
  businessAddress: z.string().trim().max(500).optional().or(z.literal("")),
  businessTaxId: z.string().trim().max(50).optional().or(z.literal("")),
});

export type BusinessInput = z.infer<typeof businessSchema>;
