import { z } from "zod";

import { PAYMENT_STATUS, type PaymentStatus } from "./status";

/** Typo guards (see `orderItemSchema.quantity` and `orderPackSchema.count`). */
export const MAX_LINE_PAIRS = 99_999;
export const MAX_PACK_COUNT = 999;

/**
 * A line item is EITHER a catalog reference (shoeModelId) OR a free-text
 * custom item (customDescription) — never both, never neither. Prisma can't
 * declare this cross-column CHECK, so it's enforced here.
 */
export const orderItemSchema = z
  .object({
    shoeModelId: z.string().min(1).nullish(),
    customDescription: z.string().trim().max(500).nullish(),
    size: z.string().trim().min(1, { message: "size_required" }).max(20),
    color: z.string().trim().max(100).optional().or(z.literal("")),
    // The cap is a typo guard, not a business rule: 10000 typed for 10 is
    // caught, and an order total stays well inside a Postgres Int of agorot.
    quantity: z
      .number()
      .int()
      .positive({ message: "quantity_positive" })
      .max(MAX_LINE_PAIRS, { message: "quantity_too_large" }),
    unitPriceAgorot: z.number().int().min(0),
  })
  .refine(
    (item) =>
      (!!item.shoeModelId && !item.customDescription) ||
      (!item.shoeModelId && !!item.customDescription),
    { message: "catalog_xor_custom", path: ["shoeModelId"] },
  );

export type OrderItemInput = z.infer<typeof orderItemSchema>;

/**
 * N packs of one catalog pack on an order. Carries no sizes or quantities on
 * purpose: the server builds the pack's items itself from the stored curve
 * (the catalog's for a new pack, the order's own snapshot for an existing
 * one), so nothing the browser sends can make a pack hold other pairs.
 */
export const orderPackSchema = z
  .object({
    /** Set when editing a pack already on this order. */
    orderPackId: z.string().min(1).optional(),
    /** The catalog pack; required for a new one. */
    sizePackId: z.string().min(1).optional(),
    shoeModelId: z.string().min(1),
    color: z.string().trim().max(100).optional().or(z.literal("")),
    unitPriceAgorot: z.number().int().min(0),
    count: z
      .number()
      .int()
      .min(1, { message: "pack_count_positive" })
      .max(MAX_PACK_COUNT, { message: "pack_count_too_large" }),
  })
  .refine((p) => !!p.orderPackId || !!p.sizePackId, {
    message: "pack_required",
    path: ["sizePackId"],
  });

export type OrderPackInput = z.infer<typeof orderPackSchema>;

export const orderSchema = z
  .object({
    customerId: z.string().min(1, { message: "customer_required" }),
    statusCode: z.string().min(1).default("not_done"),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    // Printed only on the Production sheet; `notes` never reach the factory.
    factoryNote: z.string().trim().max(2000).optional().or(z.literal("")),
    // No depositAgorot here on purpose. It is a denormalised cache of
    // SUM(Payment.amountAgorot), owned solely by recomputeOrderPayment in
    // actions/payments.ts. Accepting it from the order form let a stale value
    // overwrite a payment recorded while the edit page was open.
    // Loose pairs. Pack pairs are not sent as items — see orderPackSchema.
    items: z.array(orderItemSchema).default([]),
    packs: z.array(orderPackSchema).default([]),
  })
  // An order of only packs has no loose items, so `.min(1)` on items alone
  // would refuse it.
  .refine((o) => o.items.length > 0 || o.packs.length > 0, {
    message: "items_required",
    path: ["items"],
  });

export type OrderInput = z.infer<typeof orderSchema>;

// ---------------------------------------------------------------------------
// Portable totals logic (replaces a DB trigger) — pure, no DB access.
// ---------------------------------------------------------------------------

export interface LineForTotals {
  quantity: number;
  unitPriceAgorot: number;
}

export function lineTotalAgorot(line: LineForTotals): number {
  return line.quantity * line.unitPriceAgorot;
}

export function computeTotalAgorot(lines: LineForTotals[]): number {
  return lines.reduce((sum, line) => sum + lineTotalAgorot(line), 0);
}

export function computeBalanceAgorot(
  totalAgorot: number,
  depositAgorot: number,
): number {
  return totalAgorot - depositAgorot;
}

/**
 * What an order still owes, never less than zero.
 *
 * Use this wherever balances are summed or shown as debt: an overpaid order
 * is settled, not a credit, and a raw negative balance would quietly cancel
 * out what another order still owes.
 */
export function computeOwedAgorot(
  totalAgorot: number,
  depositAgorot: number,
): number {
  return Math.max(0, computeBalanceAgorot(totalAgorot, depositAgorot));
}

export function computePaymentStatus(
  totalAgorot: number,
  depositAgorot: number,
): PaymentStatus {
  if (totalAgorot <= 0) return PAYMENT_STATUS.UNPAID;
  if (depositAgorot <= 0) return PAYMENT_STATUS.UNPAID;
  if (depositAgorot >= totalAgorot) return PAYMENT_STATUS.PAID;
  return PAYMENT_STATUS.PARTIAL;
}

export interface OrderTotals {
  totalAgorot: number;
  balanceAgorot: number;
  paymentStatus: PaymentStatus;
}

/**
 * Recompute an order's derived money fields from its line items + deposit.
 * Call this from the order Server Actions whenever items or deposit change.
 */
export function recalculateOrderTotals(
  lines: LineForTotals[],
  depositAgorot: number,
): OrderTotals {
  const totalAgorot = computeTotalAgorot(lines);
  return {
    totalAgorot,
    balanceAgorot: computeBalanceAgorot(totalAgorot, depositAgorot),
    paymentStatus: computePaymentStatus(totalAgorot, depositAgorot),
  };
}
