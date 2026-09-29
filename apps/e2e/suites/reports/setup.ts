import { prisma } from "@repo/db";

import { createCustomer, createOrder } from "../../fixtures/db.ts";

/** A Customer owing ₪700: a ₪1,000 order with ₪300 paid. */
export async function customerOwing700(ownerId: string) {
  const customer = await createCustomer(ownerId);
  const order = await createOrder(ownerId, customer.id, 10);
  await prisma.payment.create({ data: { ownerId, orderId: order.id, amountAgorot: 30_000 } });
  await prisma.order.update({
    where: { id: order.id },
    data: { depositAgorot: 30_000, paymentStatus: "partial" },
  });
  return customer;
}
