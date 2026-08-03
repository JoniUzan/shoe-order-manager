import { z } from "zod";

export const shoeModelSchema = z.object({
  name: z.string().trim().min(1, { message: "required" }).max(200),
  sku: z.string().trim().max(100).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  // Entered in shekels in the UI, converted to agorot before persisting.
  defaultPriceAgorot: z.number().int().min(0).nullable().optional(),
  isActive: z.boolean().default(true),
});

export type ShoeModelInput = z.infer<typeof shoeModelSchema>;
