import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().trim().min(1, { error: "required" }).max(200),
  contactName: z.string().trim().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type CustomerInput = z.infer<typeof customerSchema>;
