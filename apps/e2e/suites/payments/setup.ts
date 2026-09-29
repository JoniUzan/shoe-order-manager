import { prisma } from "@repo/db";

import { createCustomer, createOrder } from "../../fixtures/db.ts";

/** A Customer with one unpaid order of ₪1,000. */
export async function unpaidOrder(ownerId: string) {
  const customer = await createCustomer(ownerId);
  const order = await createOrder(ownerId, customer.id, 10);
  return { customer, order };
}

/** A ₪1,000 order with two Payments, ₪400 then ₪100 (₪500 Paid). */
export async function orderWithPayments(ownerId: string) {
  const { customer, order } = await unpaidOrder(ownerId);
  for (const [amountAgorot, paidAt] of [
    [40_000, new Date("2026-01-01")],
    [10_000, new Date("2026-01-02")],
  ] as const) {
    await prisma.payment.create({ data: { ownerId, orderId: order.id, amountAgorot, paidAt } });
  }
  await prisma.order.update({
    where: { id: order.id },
    data: { depositAgorot: 50_000, paymentStatus: "partial" },
  });
  return { customer, order };
}
