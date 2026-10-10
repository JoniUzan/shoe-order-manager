import { defineConfig } from "@playwright/test";

import type { Options } from "./fixtures/index.ts";

// Runs against web's production build (`pnpm --filter web build` first; turbo
// does it for `pnpm test:e2e`), served on its own port with the test database.
const PORT = 3100;
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres@localhost:5432/shoe_test";
// The suites' setup writes straight to the database.
process.env.DATABASE_URL = TEST_DATABASE_URL;
// Product images go to the local S3 server, in the bucket the integration
// tests use too (global-setup.ts creates it).
const TEST_S3_ENDPOINT = process.env.TEST_S3_ENDPOINT ?? "http://localhost:8333";
process.env.IMAGE_BASE_URL = `${TEST_S3_ENDPOINT}/shoe-test`;

const desktop = { viewport: { width: 1280, height: 900 } };
const phone = {
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
};

export default defineConfig<Options>({
  testDir: "suites",
  globalSetup: "./global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Locally the installed Chrome, like browser-check; CI installs Chromium.
    channel: process.env.CI ? undefined : "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "he-desktop", use: { ...desktop, appLocale: "he" } },
    { name: "he-phone", use: { ...phone, appLocale: "he" } },
    { name: "en-desktop", use: { ...desktop, appLocale: "en" } },
    { name: "en-phone", use: { ...phone, appLocale: "en" } },
  ],
  webServer: {
    command: `pnpm --filter web exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}/he/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      DIRECT_URL: TEST_DATABASE_URL,
      AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-only-secret-not-used-anywhere-else",
      // Every suite signs in from this one machine; the limits are covered by
      // the integration tests (apps/web/src/lib/auth.test.ts).
      AUTH_RATE_LIMIT: "off",
      S3_ENDPOINT: TEST_S3_ENDPOINT,
      S3_BUCKET: "shoe-test",
      S3_ACCESS_KEY_ID: "local",
      S3_SECRET_ACCESS_KEY: "local",
      IMAGE_BASE_URL: process.env.IMAGE_BASE_URL,
    },
  },
});
