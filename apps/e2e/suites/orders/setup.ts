import { prisma } from "@repo/db";

import { createCustomer, createModel, createOrder } from "../../fixtures/db.ts";

export { createCustomer, createOrder };

/** A Customer and a Shoe model with the Pack "Mix" (8 pairs), for ordering. */
export async function orderPrerequisites(ownerId: string) {
  const [customer, model] = await Promise.all([
    createCustomer(ownerId),
    createModel(ownerId),
  ]);
  return { customer, model };
}

/**
 * Order #1: 2 Cartons of "Mix" as sold then (38×3 · 39×2 · 40×3), and the
 * catalog Pack changed since to 38×10, so the snapshot differs from it.
 */
export async function orderWithChangedPack(ownerId: string) {
  const { customer, model } = await orderPrerequisites(ownerId);
  const pack = model.packs[0]!;
  const order = await prisma.order.create({
    data: {
      ownerId,
      customerId: customer.id,
      orderNumber: 1,
      totalAgorot: 16 * 10_000,
      packs: {
        create: {
          sizePackId: pack.id,
          packName: "Mix",
          curve: "38:3,39:2,40:3",
          count: 2,
        },
      },
    },
    include: { packs: true },
  });
  const orderPack = order.packs[0]!;
  await prisma.orderItem.createMany({
    data: [
      ["38", 6],
      ["39", 4],
      ["40", 6],
    ].map(([size, quantity]) => ({
      orderId: order.id,
      packId: orderPack.id,
      shoeModelId: model.id,
      size: size as string,
      quantity: quantity as number,
      unitPriceAgorot: 10_000,
    })),
  });
  await prisma.sizePack.update({ where: { id: pack.id }, data: { curve: "38:10" } });
  return { order, model };
}

/** Orders #1–#3 for one Customer. */
export async function threeOrders(ownerId: string) {
  const customer = await createCustomer(ownerId);
  for (let i = 0; i < 3; i++) await createOrder(ownerId, customer.id, 1);
  return customer;
}

/**
 * orderPrerequisites plus an earlier Order #1 whose line has Material
 * "Leather" and Sole "EVA", so the order form suggests both.
 */
export async function orderWithMaterials(ownerId: string) {
  const { customer, model } = await orderPrerequisites(ownerId);
  await prisma.order.create({
    data: {
      ownerId,
      customerId: customer.id,
      orderNumber: 1,
      totalAgorot: 10_000,
      items: {
        create: {
          shoeModelId: model.id,
          size: "40",
          color: "Black",
          material: "Leather",
          sole: "EVA",
          quantity: 1,
          unitPriceAgorot: 10_000,
        },
      },
    },
  });
  return { customer, model };
}
