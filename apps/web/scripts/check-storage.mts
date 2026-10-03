/**
 * `pnpm storage:check`: proves the configured image storage works end to end,
 * the way the app uses it. Writes a probe object, reads it back through the S3
 * API, fetches it from IMAGE_BASE_URL like a browser would, then deletes it.
 *
 * Reads the same env as the app: the shell's, then `apps/web/.env.local`.
 * Point it at another file (say, R2 credentials kept out of .env.local) with
 * `pnpm storage:check --env .env.r2`. Prints no secrets.
 */
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";

const envFlag = process.argv.indexOf("--env");
const envFile = envFlag > 0 ? process.argv[envFlag + 1] : ".env.local";
// loadEnvFile leaves variables already set in the shell alone.
if (envFile && existsSync(envFile)) process.loadEnvFile(envFile);
else if (envFlag > 0) fail(`no env file at ${envFile}`);

// After the env is loaded: storage.ts reads it on first use.
const { deleteObject, getObject, imageUrl, putObject, storageConfigured } =
  await import("../src/lib/storage");

function fail(message: string, hint?: string): never {
  console.error(`✗ ${message}${hint ? `\n  ${hint}` : ""}`);
  process.exit(1);
}

function ok(message: string) {
  console.log(`✓ ${message}`);
}

/** A step that failed, with what to check. Thrown so cleanup still runs. */
class StepFailed extends Error {}

async function step<T>(name: string, hint: string, run: () => Promise<T>): Promise<T> {
  try {
    const value = await run();
    ok(name);
    return value;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new StepFailed(`${name}: ${reason}\n  ${hint}`);
  }
}

console.log(
  `Storage: ${process.env.S3_ENDPOINT ?? "(AWS default endpoint)"}, bucket ${process.env.S3_BUCKET ?? "(none)"}`,
);
console.log(`Public base: ${process.env.IMAGE_BASE_URL ?? "(none)"}\n`);

if (!storageConfigured()) fail("S3_BUCKET is not set", "Images are off without it.");
if (!process.env.IMAGE_BASE_URL) fail("IMAGE_BASE_URL is not set", "Browsers need it to load images.");

const key = `storage-check/${randomUUID()}.txt`;
const body = new TextEncoder().encode(`storage check ${new Date().toISOString()}`);
const same = (a: Uint8Array | null) =>
  !!a && a.length === body.length && a.every((byte, i) => byte === body[i]);

try {
  await step("write a probe object", "Check S3_ENDPOINT, the key pair, and that the token can write to this bucket.", () =>
    putObject(key, body, "text/plain"),
  );
  try {
    await step("read it back through the S3 API", "The token may be write-only: give it Object Read & Write.", async () => {
      if (!same(await getObject(key))) throw new Error("the bytes read back differ");
    });

    await step(`fetch it from ${imageUrl(key)}`, "Turn on the bucket's public access (r2.dev or a custom domain) and check IMAGE_BASE_URL points at it, with no trailing slash.", async () => {
      const res = await fetch(imageUrl(key)!);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!same(new Uint8Array(await res.arrayBuffer()))) throw new Error("the bytes served differ");
    });
  } finally {
    // Clean up even when a read failed, so a failed check leaves nothing behind.
    await step("delete it", "The token may not be allowed to delete objects.", () => deleteObject(key));
  }
  await step("confirm it is gone", "The delete reported success but the object is still there.", async () => {
    if (await getObject(key)) throw new Error("still there");
  });
} catch (error) {
  if (!(error instanceof StepFailed)) throw error;
  fail(error.message);
}

console.log("\nStorage is ready for Product images.");
