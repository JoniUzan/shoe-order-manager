/**
 * Money is stored everywhere as integer agorot (1 shekel = 100 agorot).
 * These helpers convert to/from the shekel values shown/entered in the UI.
 */

export const AGOROT_PER_SHEKEL = 100;

/**
 * Money columns are Postgres `Int` (32-bit), so no stored amount — an order
 * total above all — may exceed this. Writes check it and fail with a result
 * instead of letting the insert throw.
 */
export const MAX_AGOROT = 2_147_483_647;

/** Convert integer agorot to a shekel number (e.g. 12345 -> 123.45). */
export function agorotToShekels(agorot: number): number {
  return agorot / AGOROT_PER_SHEKEL;
}

/** Convert a shekel amount to integer agorot, rounded (e.g. 123.45 -> 12345). */
export function shekelsToAgorot(shekels: number): number {
  return Math.round(shekels * AGOROT_PER_SHEKEL);
}

/**
 * Format agorot as a localized currency string.
 * Defaults to ILS (₪); locale controls digit/grouping/symbol placement.
 */
export function formatMoney(
  agorot: number,
  locale: string = "he",
  currency: string = "ILS",
): string {
  return new Intl.NumberFormat(locale === "he" ? "he-IL" : "en-US", {
    style: "currency",
    currency,
  }).format(agorotToShekels(agorot));
}

/**
 * Format agorot short, for a chart axis: "₪40K", "₪1.3M". Whole shekels below
 * a thousand, one decimal at most above.
 */
export function formatMoneyCompact(agorot: number, locale: string = "he"): string {
  return new Intl.NumberFormat(locale === "he" ? "he-IL" : "en-US", {
    style: "currency",
    currency: "ILS",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(agorotToShekels(agorot));
}

/** Parse a user-entered shekel string ("123.45", "1,234.5") into agorot. */
export function parseShekelInput(input: string): number | null {
  const cleaned = input.replace(/[^\d.-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const value = Number(cleaned);
  if (Number.isNaN(value)) return null;
  return shekelsToAgorot(value);
}
