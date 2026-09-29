import { execSync } from "node:child_process";

/**
 * Bring the test database up to the latest migration and seed it (order
 * statuses, admin). `migrate deploy` creates the database if it's missing.
 * Nothing is wiped between runs: every test makes its own User, and all data
 * is scoped by ownerId, so old rows never get in the way.
 *
 * Shared by Vitest and Playwright; the latter loads it as CommonJS, so no
 * `import.meta` here.
 */
export default function setup() {
  const url =
    process.env.TEST_DATABASE_URL ??
    "postgresql://postgres@localhost:5432/shoe_test";
  const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url };
  for (const cmd of ["prisma migrate deploy", "prisma db seed"]) {
    execSync(`pnpm --filter @repo/db exec ${cmd}`, { env, stdio: "pipe" });
  }
}
