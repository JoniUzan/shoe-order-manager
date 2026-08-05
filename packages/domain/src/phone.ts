/**
 * Phone normalization for WhatsApp deep links.
 * Israeli numbers are entered many ways (050-..., +972..., spaces); wa.me
 * needs an international number with no "+" or separators.
 */

const DEFAULT_COUNTRY_CODE = "972"; // Israel

/**
 * Normalize a phone string to wa.me form (digits only, intl prefix, no "+").
 * Returns null if there aren't enough digits to be a real number.
 */
export function normalizePhoneForWhatsApp(
  raw: string | null | undefined,
  countryCode: string = DEFAULT_COUNTRY_CODE,
): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, "");

  if (digits.startsWith("+")) {
    digits = digits.slice(1);
    return digits.length >= 8 ? digits : null;
  }
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
    return digits.length >= 8 ? digits : null;
  }
  // Local form: drop a leading 0 and prepend the country code.
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  const full = countryCode + digits;
  return full.length >= 10 ? full : null;
}

export function isValidWhatsAppPhone(
  raw: string | null | undefined,
): boolean {
  return normalizePhoneForWhatsApp(raw) !== null;
}

/**
 * Build a wa.me deep link with a prefilled message, or null when the phone
 * can't be normalized to an international number.
 */
export function buildWhatsAppUrl(
  rawPhone: string | null | undefined,
  text: string,
): string | null {
  const phone = normalizePhoneForWhatsApp(rawPhone);
  if (!phone) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
