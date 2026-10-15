import { execSync } from "node:child_process";

/**
 * Bring the test database up to the latest migration (which creates the order
 * statuses), and make the Product image bucket. The local S3 server takes
 * unsigned requests, and answers 409 when the bucket is already there. `migrate deploy` creates the database if it's missing. Nothing
 * is wiped: every test makes its own User, and all data is scoped by ownerId.
 */
export default async function setup() {
  const url =
    process.env.TEST_DATABASE_URL ??
    "postgresql://postgres@localhost:5432/shoe_test";
  const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url };
  execSync("pnpm --filter @repo/db exec prisma migrate deploy", { env, stdio: "pipe" });
  const s3 = process.env.TEST_S3_ENDPOINT ?? "http://localhost:8333";
  const res = await fetch(`${s3}/shoe-test`, { method: "PUT" }).catch(() => null);
  if (!res || (!res.ok && res.status !== 409)) {
    throw new Error(`No S3 server at ${s3}: start it with \`docker compose up -d\``);
  }
}
