import { prisma } from "@repo/db";

import { createCustomer, createOrder } from "../../fixtures/db.ts";

export { createCustomer };

/** A Customer with one order, which can't be deleted. */
export async function customerWithOrder(ownerId: string) {
  const customer = await createCustomer(ownerId);
  await createOrder(ownerId, customer.id, 1);
  return customer;
}

/** A Customer whose only order is done, so the "open" filter finds nothing. */
export async function customerWithDoneOrder(ownerId: string) {
  const customer = await createCustomer(ownerId);
  const order = await createOrder(ownerId, customer.id, 1);
  await prisma.order.update({ where: { id: order.id }, data: { statusCode: "done" } });
  return customer;
}
