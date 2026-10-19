import { test as base, expect, type Page } from "@playwright/test";

import { createAccount, PASSWORD } from "./db.ts";
import { translator, type Locale, type T } from "./i18n.ts";

export { expect };
export type { Locale, T };
export { PASSWORD };

export interface Options {
  appLocale: Locale;
}

type Account = { id: string; email: string; name: string | null };

/**
 * Waits until a page has streamed in (ADR 0012): no skeleton left on it. Until
 * then a label a skeleton draws for real (a card's title) is on the page more
 * than once, and a strict locator on it fails.
 */
export async function streamed(page: Page) {
  await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);
}

export async function login(page: Page, locale: Locale, email: string, password = PASSWORD) {
  await page.goto(`/${locale}/login`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
}

// next-themes' inline <script> warns on every page, and a request cut off by
// navigating away is not an error of the page.
const knownNoise = (text: string) => text.startsWith("Encountered a script tag");

export const test = base.extend<
  Options & { t: T; account: Account; user: Account; pageErrors: string[] }
>({
  appLocale: ["he", { option: true }],

  t: async ({ appLocale }, use) => use(translator(appLocale)),

  // Any page error or console error fails the test.
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error" && !knownNoise(m.text())) errors.push(m.text());
      });
      await use(errors);
      expect(errors, "page errors").toEqual([]);
    },
    { auto: true },
  ],

  /** A fresh onboarded User in the project's language, not logged in. */
  account: async ({ appLocale }, use) => use(await createAccount(appLocale)),

  /** The same User, logged in. */
  user: async ({ page, appLocale, account }, use) => {
    await login(page, appLocale, account.email);
    await page.waitForURL((url) => !url.pathname.endsWith("/login"));
    await use(account);
  },
});
