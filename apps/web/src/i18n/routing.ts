import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["he", "en"],
  defaultLocale: "he",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

/** Each language named in itself, for the language pickers. */
export const LOCALE_LABELS: Record<Locale, string> = {
  he: "עברית",
  en: "English",
};
