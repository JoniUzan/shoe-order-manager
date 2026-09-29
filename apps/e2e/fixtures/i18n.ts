import en from "../../web/messages/en.json" with { type: "json" };
import he from "../../web/messages/he.json" with { type: "json" };

export type Locale = "he" | "en";

/**
 * The UI string for `namespace.key` in a locale, with `{name}` placeholders
 * filled (no ICU plurals). Page objects find controls by the text the user
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
    return text.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
  };
}
