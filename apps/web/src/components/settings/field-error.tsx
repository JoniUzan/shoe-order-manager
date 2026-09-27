"use client";

import { useTranslations } from "next-intl";

/** Messages a settings field error may carry — keys in `settings.errors`. */
const KNOWN = [
  "required",
  "email",
  "emailTaken",
  "wrongPassword",
  "passwordTooShort",
  "passwordMismatch",
] as const;

type Known = (typeof KNOWN)[number];

/**
 * The settings schemas set a message key (not text) on each error; this turns
 * it into the translated line under the field. An unknown key (e.g. Zod's own
 * "too long") falls back to a generic "invalid".
 */
export function FieldError({ message }: { message?: string }) {
  const t = useTranslations("settings.errors");
  if (!message) return null;
  const key: Known | "invalid" = (KNOWN as readonly string[]).includes(message)
    ? (message as Known)
    : "invalid";
  return <p className="text-sm text-destructive">{t(key)}</p>;
}
