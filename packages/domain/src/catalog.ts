import { z } from "zod";

/**
 * The sizing system a model's numbers belong to.
 *
 * A label, not a validator: EU, US and UK are all numeric, so the format never
 * changes what counts as a valid size. It exists so an order or invoice can say
 * "EU 42" rather than a bare 42.
 */
export const SIZE_FORMATS = ["eu", "us", "uk"] as const;
export type SizeFormat = (typeof SIZE_FORMATS)[number];

/** Deliberately untranslated — these abbreviations read the same everywhere. */
const SIZE_FORMAT_LABEL: Record<SizeFormat, string> = {
  eu: "EU",
  us: "US",
  uk: "UK",
};

export function isSizeFormat(value: unknown): value is SizeFormat {
  return (
    typeof value === "string" && (SIZE_FORMATS as readonly string[]).includes(value)
  );
}

/** "EU 42". Falls back to the bare size when the format is unknown — a custom
 *  line item has no catalog model behind it and so no system to name. */
export function formatSize(size: string, format?: string | null): string {
  return isSizeFormat(format) ? `${SIZE_FORMAT_LABEL[format]} ${size}` : size;
}

/**
 * A single size.
 *
 * Numeric, because every supported format is. Letters were considered and
 * dropped; permitting them meant any typo in the "add a size" box became a
 * size, and one non-numeric value silently disabled the numeric sort for the
 * whole run. The comma is also rejected because it is the storage separator.
 */
export const sizeSchema = z
  .string()
  .trim()
  .min(1, { message: "size_empty" })
  .max(20)
  .refine((s) => !s.includes(","), { message: "size_no_comma" })
  .refine((s) => Number.isFinite(Number(s)), { message: "size_numeric" })
  .refine((s) => Number(s) > 0, { message: "size_positive" });

/** The most sizes one model may carry; also the ceiling on a generated run. */
export const MAX_SIZES = 60;

/**
 * Canonical form of a single size, or "" if it is not a usable one.
 *
 * Collapses to the shortest exact spelling, so "42.0" and "42.50" can never sit
 * alongside "42" and "42.5" as separate columns in the order grid. Anything
 * non-numeric returns "" and is dropped by the callers below, which is what
 * keeps a stray "abc" out of a size run.
 */
export function normalizeSize(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? String(n) : "";
}

export function parseSizes(stored: string | null | undefined): string[] {
  if (!stored) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of stored.split(",")) {
    const size = normalizeSize(raw);
    if (!size || seen.has(size)) continue;
    seen.add(size);
    out.push(size);
  }
  return out;
}

/**
 * Deduped, normalised and sorted ascending. Sizes are always numeric, so the
 * sort is unconditional — a run typed out of order would otherwise lay the
 * order form's grid out jumbled.
 */
export function canonicalSizes(sizes: string[]): string[] {
  return [...parseSizes(sizes.join(","))].sort((a, b) => Number(a) - Number(b));
}

export function serializeSizes(sizes: string[]): string | null {
  const ordered = canonicalSizes(sizes);
  return ordered.length > 0 ? ordered.join(",") : null;
}

/**
 * Expand from/to/step into the sizes it covers, inclusive of both ends.
 *
 * Steps accumulate through multiplication rather than repeated addition:
 * adding 0.5 ten times drifts into 42.00000000000001, which `normalizeSize`
 * would then keep as its own distinct size.
 */
export function expandSizeRange(
  from: number,
  to: number,
  step: 0.5 | 1,
): string[] {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) return [];
  const count = Math.floor((to - from) / step) + 1;
  const out: string[] = [];
  for (let i = 0; i < count && out.length < MAX_SIZES; i++) {
    // normalizeSize returns "" for anything <= 0. Skipping rather than pushing
    // keeps a from of 0 or below from producing blank, unlabelled chips that
    // the model schema then rejects with no field to point at — and stops those
    // blanks from eating into the MAX_SIZES budget and truncating the real run.
    const size = normalizeSize(String(from + i * step));
    if (size) out.push(size);
  }
  return out;
}

export const shoeModelSchema = z.object({
  name: z.string().trim().min(1, { message: "required" }).max(200),
  sku: z.string().trim().max(100).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  // Entered in shekels in the UI, converted to agorot before persisting.
  defaultPriceAgorot: z.number().int().min(0).nullable().optional(),
  sizes: z.array(sizeSchema).max(MAX_SIZES).default([]),
  sizeFormat: z.enum(SIZE_FORMATS).default("eu"),
  isActive: z.boolean().default(true),
});

export type ShoeModelInput = z.infer<typeof shoeModelSchema>;
