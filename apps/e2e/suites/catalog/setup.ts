import { prisma } from "@repo/db";

import { createCustomer, createModel } from "../../fixtures/db.ts";

export { createModel };

/** A model that one order uses, so it can't be deleted. */
export async function modelInUse(ownerId: string) {
  const model = await createModel(ownerId);
  const customer = await createCustomer(ownerId);
  await prisma.order.create({
    data: {
      ownerId,
      customerId: customer.id,
      orderNumber: 1,
      totalAgorot: 10_000,
      items: {
        create: { shoeModelId: model.id, size: "38", quantity: 1, unitPriceAgorot: 10_000 },
      },
    },
  });
  return model;
}
