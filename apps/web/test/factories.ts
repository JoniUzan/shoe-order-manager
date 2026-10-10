import { randomUUID } from "node:crypto";

import { prisma } from "@repo/db";

import { hashPassword } from "better-auth/crypto";

import { signInAs } from "./session";

export const PASSWORD = "password123";

export function uniqueEmail() {
  return `test-${randomUUID()}@example.com`;
}

/**
 * A fresh, onboarded User, signed in. Each test makes its own, so tests never
 * share data and can run in parallel.
 */
export async function createUser(opts: { password?: boolean } = {}) {
  const user = await prisma.user.create({
    data: {
      email: uniqueEmail(),
      name: "Test User",
      onboardedAt: new Date(),
    },
  });
  if (opts.password) {
    // Email + password sign-in is Better Auth's `credential` account.
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: await hashPassword(PASSWORD),
      },
    });
  }
  signInAs(user.id);
  return user;
}

export function createCustomer(ownerId: string, name = "Store") {
  return prisma.customer.create({ data: { ownerId, name } });
}

/** A Shoe model sized 38–40 with one Pack, 38×3 · 39×2 · 40×3 (8 pairs). */
export function createModel(ownerId: string, defaultPriceAgorot = 10_000) {
  return prisma.shoeModel.create({
    data: {
      ownerId,
      name: "Runner",
      sizes: "38,39,40",
      defaultPriceAgorot,
      packs: { create: { name: "Mix", curve: "38:3,39:2,40:3", sortOrder: 0 } },
    },
    include: { packs: true },
  });
}
