/**
 * Order status + payment status shared types.
 * Status codes live in the DB (OrderStatus table) so stages can be added
 * without code changes; these constants cover the v1 seed.
 */

export const ORDER_STATUS = {
  NOT_DONE: "not_done",
  DONE: "done",
} as const;

export type OrderStatusCode = string;

export const PAYMENT_STATUS = {
  UNPAID: "unpaid",
  PARTIAL: "partial",
  PAID: "paid",
} as const;

export type PaymentStatus =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const PAYMENT_STATUSES: PaymentStatus[] = [
  PAYMENT_STATUS.UNPAID,
  PAYMENT_STATUS.PARTIAL,
  PAYMENT_STATUS.PAID,
];
