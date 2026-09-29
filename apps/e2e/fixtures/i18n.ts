import { IntlMessageFormat } from "intl-messageformat";

import en from "../../web/messages/en.json" with { type: "json" };
import he from "../../web/messages/he.json" with { type: "json" };

export type Locale = "he" | "en";

/**
 * The UI string for `namespace.key` in a locale, formatted with the same ICU
 * engine next-intl uses (placeholders, plurals). Page objects find controls by the text the user
 * reads, so one spec runs in both languages.
 */
export type T = (key: string, values?: Record<string, string | number>) => string;

export function translator(locale: Locale): T {
  const messages: unknown = locale === "he" ? he : en;
  return (key, values = {}) => {
    const text = key
      .split(".")
      .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], messages);
    if (typeof text !== "string") throw new Error(`No message ${key}`);
    return String(new IntlMessageFormat(text, locale).format(values));
  };
}
