import { createCustomer, createOrder } from "../../fixtures/db.ts";

export { createCustomer };

/** A Customer with one order, which can't be deleted. */
export async function customerWithOrder(ownerId: string) {
  const customer = await createCustomer(ownerId);
  await createOrder(ownerId, customer.id, 1);
  return customer;
}
