import { z } from "zod";

export const LOCALES = ["he", "en"] as const;
export const THEMES = ["light", "dark", "system"] as const;

export type LocaleCode = (typeof LOCALES)[number];
export type ThemeCode = (typeof THEMES)[number];

/** Minimum length for a new password. */
export const PASSWORD_MIN = 8;

export const nameSchema = z.object({
  name: z.string().trim().min(1, { message: "required" }).max(100),
});

export type NameInput = z.infer<typeof nameSchema>;

/** The email is the login, so changing it asks for the current password. */
export const emailChangeSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: "email" }).max(200),
  currentPassword: z.string().min(1, { message: "required" }).max(200),
});

export type EmailChangeInput = z.infer<typeof emailChangeSchema>;

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

/** A new account. The email is stored lower-cased; login matches it either way. */
export const signupSchema = z.object({
  name: z.string().trim().min(1, { message: "required" }).max(100),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { message: "required" })
    .email({ message: "email" })
    .max(200),
  password: z.string().min(PASSWORD_MIN, { message: "passwordTooShort" }).max(200),
});

export type SignupInput = z.infer<typeof signupSchema>;
