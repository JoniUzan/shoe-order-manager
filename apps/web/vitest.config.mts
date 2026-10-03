import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Integration tests: the real Server Actions against a real Postgres. The
// database is separate from the dev one; see test/global-setup.ts.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres@localhost:5432/shoe_test";

// Product images go to the local S3 server (docker compose), in a bucket of
// their own that global setup creates.
const TEST_S3_ENDPOINT = process.env.TEST_S3_ENDPOINT ?? "http://localhost:8333";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // tsconfig says "preserve" for Next; the PDF route's components need
  // transforming here.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      DIRECT_URL: TEST_DATABASE_URL,
      S3_ENDPOINT: TEST_S3_ENDPOINT,
      S3_BUCKET: "shoe-test",
      S3_ACCESS_KEY_ID: "local",
      S3_SECRET_ACCESS_KEY: "local",
      IMAGE_BASE_URL: `${TEST_S3_ENDPOINT}/shoe-test`,
    },
    globalSetup: ["test/global-setup.ts"],
    setupFiles: ["test/setup.ts"],
    // next-auth imports `next/server` without an extension, which Node's ESM
    // loader refuses; bundling it through Vite resolves it.
    server: { deps: { inline: ["next-auth"] } },
    // The lock tests wait on real row locks.
    testTimeout: 20_000,
    coverage: {
      provider: "v8",
      include: ["src/lib/actions/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
      reporter: ["text", "html", "json-summary"],
      // Only ever raise these.
      thresholds: { lines: 70, branches: 70, functions: 70, statements: 70 },
    },
  },
});
