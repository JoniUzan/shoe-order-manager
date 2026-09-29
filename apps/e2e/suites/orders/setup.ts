import { createCustomer, createModel } from "../../fixtures/db.ts";

/** A Customer and a Shoe model with the Pack "Mix" (8 pairs), for ordering. */
export async function orderPrerequisites(ownerId: string) {
  const [customer, model] = await Promise.all([
    createCustomer(ownerId),
    createModel(ownerId),
  ]);
  return { customer, model };
}
