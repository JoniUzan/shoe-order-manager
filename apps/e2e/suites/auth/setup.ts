import { randomUUID } from "node:crypto";

import type { Page } from "@playwright/test";

/**
 * Sign-up is rate-limited per IP; the app trusts x-real-ip (set by Vercel),
 * so give this page its own bucket.
 */
export async function ownSignupBucket(page: Page) {
  await page.setExtraHTTPHeaders({ "x-real-ip": `e2e-${randomUUID()}` });
}
