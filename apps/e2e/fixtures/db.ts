import { randomUUID } from "node:crypto";

import { prisma } from "@repo/db";
import { hashPassword } from "better-auth/crypto";

import type { Locale } from "./i18n.ts";

/** Shared building blocks for the suites' setup.ts. Everything is per-User. */

export const PASSWORD = "password123";

export const unique = (prefix: string) => `${prefix} ${randomUUID().slice(0, 8)}`;

export function uniqueEmail() {
  return `e2e-${randomUUID()}@example.com`;
}

export async function createAccount(locale: Locale, opts: { onboarded?: boolean } = {}) {
  const user = await prisma.user.create({
    data: {
      email: uniqueEmail(),
      name: "E2E User",
      locale,
      onboardedAt: opts.onboarded === false ? null : new Date(),
    },
    select: { id: true, email: true, name: true },
  });
  // Email + password sign-in is Better Auth's `credential` account.
  await prisma.account.create({
    data: {
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: await hashPassword(PASSWORD),
    },
  });
  return user;
}

export function createCustomer(ownerId: string, name = unique("Store")) {
  return prisma.customer.create({ data: { ownerId, name } });
}

/** A Shoe model sized 38–40 at ₪100, with the Pack "Mix" 38×3 · 39×2 · 40×3. */
export function createModel(ownerId: string, name = unique("Runner")) {
  return prisma.shoeModel.create({
    data: {
      ownerId,
      name,
      sizes: "38,39,40",
      defaultPriceAgorot: 10_000,
      packs: { create: { name: "Mix", curve: "38:3,39:2,40:3", sortOrder: 0 } },
    },
    include: { packs: true },
  });
}

/** An order of `pairs` custom pairs at ₪100, numbered after the User's last one. */
export async function createOrder(ownerId: string, customerId: string, pairs = 10) {
  const last = await prisma.order.findFirst({
    where: { ownerId },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  return prisma.order.create({
    data: {
      ownerId,
      customerId,
      orderNumber: (last?.orderNumber ?? 0) + 1,
      totalAgorot: pairs * 10_000,
      isCustomOrder: true,
      items: {
        create: { customDescription: "Sandals", size: "40", quantity: pairs, unitPriceAgorot: 10_000 },
      },
    },
  });
}
