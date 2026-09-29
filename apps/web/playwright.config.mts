import { defineConfig } from "@playwright/test";

import type { Options } from "./e2e/fixtures.mjs";

// E2E runs against a production build (`pnpm build` first) served on its own
// port, with the same test database as the integration tests.
const PORT = 3100;
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres@localhost:5432/shoe_test";
// The fixtures write Users straight to the database.
process.env.DATABASE_URL = TEST_DATABASE_URL;

const desktop = { viewport: { width: 1280, height: 900 } };
const phone = {
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
};

export default defineConfig<Options>({
  testDir: "e2e",
  globalSetup: "./test/global-setup.ts",
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
    command: `pnpm exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}/he/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      DIRECT_URL: TEST_DATABASE_URL,
      AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-only-secret-not-used-anywhere-else",
      AUTH_TRUST_HOST: "true",
    },
  },
});
