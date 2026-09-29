import { createCustomer, createOrder } from "../../fixtures/db.ts";

/** A Customer with one unpaid order of ₪1,000. */
export async function unpaidOrder(ownerId: string) {
  const customer = await createCustomer(ownerId);
  const order = await createOrder(ownerId, customer.id, 10);
  return { customer, order };
}
