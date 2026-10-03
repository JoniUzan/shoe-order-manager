import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

/**
 * Prisma 7 connects through a driver adapter (node-postgres), so the pool
 * settings are pg's, not Prisma's: the old `connection_limit` / `pgbouncer`
 * URL parameters no longer do anything.
 *
 * Safe behind a transaction-mode pooler (Neon's `-pooler` host, PgBouncer):
 * the adapter sends unnamed statements (no `statementNameGenerator`), so no
 * prepared statement outlives the transaction that made it.
 */
function createClient() {
  const poolMax = Number(process.env.DATABASE_POOL_MAX);
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // pg's default is 10 connections per process. Serverless hosts should set
    // DATABASE_POOL_MAX=1 (what `connection_limit=1` did under Prisma 6).
    ...(poolMax > 0 ? { max: poolMax } : {}),
    // pg waits forever for a connection by default; Prisma 6 gave up after 10s
    // (pool_timeout) — fail instead of hanging a request.
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
