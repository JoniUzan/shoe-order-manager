/**
 * What `@repo/db` resolves to in browser bundles (the "browser" export
 * condition in package.json). Client components import constants from
 * server-side query modules (e.g. `CATALOG_LIST_DEFAULTS` from
 * `lib/catalog-query.ts`) whose other exports use `prisma`; without this
 * entry the pg driver would be pulled into the client bundle and the build
 * fails. `@prisma/client` did the same for Prisma 6 with its own browser stub.
 *
 * Same export names as `index.ts`; the client itself only throws if used.
 */
import type { PrismaClient as PrismaClientType } from "./generated/prisma/client";

export { Prisma } from "./generated/prisma/browser";
export type {
  User,
  SignupAttempt,
  Account,
  Session,
  OrderStatus,
  Customer,
  ShoeModel,
  SizePack,
  Order,
  OrderItem,
  OrderPack,
  Payment,
} from "./generated/prisma/browser";

function serverOnly(): never {
  throw new Error("@repo/db: Prisma Client is server-only and can't run in the browser.");
}

export const PrismaClient = function PrismaClient() {
  serverOnly();
} as unknown as typeof PrismaClientType;

export const prisma = new Proxy({} as PrismaClientType, { get: serverOnly });
