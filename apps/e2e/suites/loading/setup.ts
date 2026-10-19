import type { Page } from "@playwright/test";

/**
 * Holds every Server Action call (a POST with a `Next-Action` header) until
 * the returned function is called, so a test can look at the pending state.
 */
export async function holdServerActions(page: Page) {
  let release!: () => void;
  const released = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"]) await released;
    await route.fallback();
  });
  return release;
}
