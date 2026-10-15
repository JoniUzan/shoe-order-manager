import { execSync } from "node:child_process";

import {
  BucketAlreadyExists,
  BucketAlreadyOwnedByYou,
  CreateBucketCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/** The Product image bucket the tests write to (see vitest.config.mts). */
async function createBucket() {
  const endpoint = process.env.TEST_S3_ENDPOINT ?? "http://localhost:8333";
  const client = new S3Client({
    endpoint,
    region: "auto",
    credentials: { accessKeyId: "local", secretAccessKey: "local" },
    forcePathStyle: true,
  });
  try {
    await client.send(new CreateBucketCommand({ Bucket: "shoe-test" }));
  } catch (error) {
    if (error instanceof BucketAlreadyOwnedByYou) return;
    if (error instanceof BucketAlreadyExists) return;
    throw new Error(
      `No S3 server at ${endpoint}: start it with \`docker compose up -d\``,
      { cause: error },
    );
  }
}

/**
 * Bring the test database up to the latest migration (which creates the order
 * statuses); tests make their own Users, so nothing is seeded. `migrate deploy` creates the database if it's missing.
 * Nothing is wiped between runs: every test makes its own User, and all data
 * is scoped by ownerId, so old rows never get in the way.
 */
export default async function setup() {
  const url =
    process.env.TEST_DATABASE_URL ??
    "postgresql://postgres@localhost:5432/shoe_test";
  const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url };
  execSync("pnpm --filter @repo/db exec prisma migrate deploy", { env, stdio: "pipe" });
  await createBucket();
}
