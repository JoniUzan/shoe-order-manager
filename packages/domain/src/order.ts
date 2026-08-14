import { z } from "zod";

import { PAYMENT_STATUS, type PaymentStatus } from "./status";

/**
 * A line item is EITHER a catalog reference (shoeModelId) OR a free-text
 * custom item (customDescription) — never both, never neither. SQLite can't
 * express this cross-column CHECK via Prisma, so it's enforced here.
 */
export const orderItemSchema = z
  .object({
    shoeModelId: z.string().min(1).nullish(),
    customDescription: z.string().trim().max(500).nullish(),
    size: z.string().trim().min(1, { message: "size_required" }).max(20),
    color: z.string().trim().max(100).optional().or(z.literal("")),
    quantity: z.number().int().positive({ message: "quantity_positive" }),
    unitPriceAgorot: z.number().int().min(0),
  })
  .refine(
    (item) =>
      (!!item.shoeModelId && !item.customDescription) ||
      (!item.shoeModelId && !!item.customDescription),
    { message: "catalog_xor_custom", path: ["shoeModelId"] },
  );

export type OrderItemInput = z.infer<typeof orderItemSchema>;

export const orderSchema = z.object({
  customerId: z.string().min(1, { message: "customer_required" }),
  statusCode: z.string().min(1).default("not_done"),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  // No depositAgorot here on purpose. It is a denormalised cache of
  // SUM(Payment.amountAgorot), owned solely by recomputeOrderPayment in
  // actions/payments.ts. Accepting it from the order form let a stale value
  // overwrite a payment recorded while the edit page was open.
  items: z.array(orderItemSchema).min(1, { message: "items_required" }),
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
