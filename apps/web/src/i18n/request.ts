import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale, locale: override }) => {
  // `override` is set when an explicit locale is passed, e.g.
  // `getTranslations({ locale })` in not-found.tsx where the request locale
  // isn't established; otherwise fall back to the matched `[locale]` segment.
  const requested = override ?? (await requestLocale);
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
