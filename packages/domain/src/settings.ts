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

/**
 * The preset orbs a User can pick as their Avatar, in the picker's order
 * (its "01 · Peach" numbering). Stored on the User as `orb:<code>`.
 */
export const AVATARS = [
  "peach",
  "abyss",
  "rust",
  "onyx",
  "moss",
  "crimson",
  "bronze",
  "ochre",
  "lunar",
  "ember",
  "amber",
] as const;

export type AvatarCode = (typeof AVATARS)[number];

export const avatarSchema = z.object({ avatar: z.enum(AVATARS) });

export type AvatarInput = z.infer<typeof avatarSchema>;

/** Finishing onboarding needs a business name; the rest stays optional. */
export const finishOnboardingSchema = businessSchema.extend({
  businessName: z.string().trim().min(1, { message: "required" }).max(200),
});

export type FinishOnboardingInput = z.infer<typeof finishOnboardingSchema>;
