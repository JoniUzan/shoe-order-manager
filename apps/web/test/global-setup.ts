import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const dbPackage = fileURLToPath(new URL("../../../packages/db", import.meta.url));

/**
 * Bring the test database up to the latest migration and seed it (order
 * statuses, admin). `migrate deploy` creates the database if it's missing.
 * Nothing is wiped between runs: every test makes its own User, and all data
 * is scoped by ownerId, so old rows never get in the way.
 */
export default function setup() {
  const url =
    process.env.TEST_DATABASE_URL ??
    "postgresql://postgres@localhost:5432/shoe_test";
  const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url };
  execSync("pnpm exec prisma migrate deploy", { cwd: dbPackage, env, stdio: "pipe" });
  execSync("pnpm exec prisma db seed", { cwd: dbPackage, env, stdio: "pipe" });
}
