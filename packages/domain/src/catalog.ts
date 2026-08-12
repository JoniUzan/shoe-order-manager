import { z } from "zod";

/**
 * A model's size run, stored as one comma-separated string (see the note on
 * `ShoeModel.sizes`). The comma is the separator, so it cannot appear inside a
 * size — that is the only real constraint, since sizes are free text ("42",
 * "42.5", "US 9") and must never be coerced to numbers.
 */
export const sizeSchema = z
  .string()
  .trim()
  .min(1, { message: "size_empty" })
  .max(20)
  .refine((s) => !s.includes(","), { message: "size_no_comma" });

/** Order is meaningful — a size run reads 39,40,41, so never sort. */
export function parseSizes(stored: string | null | undefined): string[] {
  if (!stored) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of stored.split(",")) {
    const size = raw.trim();
    if (!size || seen.has(size)) continue;
    seen.add(size);
    out.push(size);
  }
  return out;
}

/** Returns null rather than "" so an empty run reads as absent in the DB. */
export function serializeSizes(sizes: string[]): string | null {
  const cleaned = parseSizes(sizes.join(","));
  return cleaned.length > 0 ? cleaned.join(",") : null;
}

export const shoeModelSchema = z.object({
  name: z.string().trim().min(1, { message: "required" }).max(200),
  sku: z.string().trim().max(100).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  // Entered in shekels in the UI, converted to agorot before persisting.
  defaultPriceAgorot: z.number().int().min(0).nullable().optional(),
  sizes: z.array(sizeSchema).max(60).default([]),
  isActive: z.boolean().default(true),
});

export type ShoeModelInput = z.infer<typeof shoeModelSchema>;
