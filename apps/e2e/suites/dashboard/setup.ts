import { prisma } from "@repo/db";

import { createCustomer, createOrder } from "../../fixtures/db.ts";

/**
 * A Customer with two Orders: #1, open and unpaid, ₪1,000, made today; and
 * #2, done, ₪500 with ₪200 paid, made 20 days ago. Balance due ₪1,300; one
 * open Order; one new in the last 7 days.
 */
export async function businessWithOrders(ownerId: string) {
  const customer = await createCustomer(ownerId);
  const open = await createOrder(ownerId, customer.id, 10);
  const done = await createOrder(ownerId, customer.id, 5);
  const twentyDaysAgo = new Date(Date.now() - 20 * 86_400_000);
  await prisma.payment.create({
    data: { ownerId, orderId: done.id, amountAgorot: 20_000, paidAt: twentyDaysAgo },
  });
  await prisma.order.update({
    where: { id: done.id },
    data: {
      statusCode: "done",
      depositAgorot: 20_000,
      paymentStatus: "partial",
      createdAt: twentyDaysAgo,
    },
  });
  return { customer, open };
}
