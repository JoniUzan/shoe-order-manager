import { randomUUID } from "node:crypto";

import { test as base, expect, type Page } from "@playwright/test";
import { prisma } from "@repo/db";
import bcrypt from "bcryptjs";

import en from "../messages/en.json" with { type: "json" };
import he from "../messages/he.json" with { type: "json" };

export type Locale = "he" | "en";
export interface Options {
  appLocale: Locale;
}

export const PASSWORD = "password123";

type Messages = typeof en;

/**
 * The UI string for `namespace.key` in the project's locale, with `{name}`
 * placeholders filled. Specs find controls by the same text the user reads,
 * so one spec runs in both languages.
 */
export type T = (key: string, values?: Record<string, string | number>) => string;

function translator(locale: Locale): T {
  const messages: Messages = locale === "he" ? (he as Messages) : en;
  return (key, values = {}) => {
    const text = key
      .split(".")
      .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], messages);
    if (typeof text !== "string") throw new Error(`No message ${key}`);
    return text.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
  };
}

export async function login(page: Page, locale: Locale, email: string) {
  await page.goto(`/${locale}/login`);
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.endsWith("/login"));
}

// next-themes' inline <script> warns on every page; it is not a bug.
const knownNoise = (text: string) => text.startsWith("Encountered a script tag");

export const test = base.extend<
  Options & {
    t: T;
    user: { id: string; email: string };
    pageErrors: string[];
  }
>({
  appLocale: ["he", { option: true }],

  t: async ({ appLocale }, use) => use(translator(appLocale)),

  // Any page error or console error fails the test, as in browser-check.
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

  /** A fresh, onboarded User in the project's language, logged in. */
  user: async ({ page, appLocale }, use) => {
    const user = await prisma.user.create({
      data: {
        email: `e2e-${randomUUID()}@example.com`,
        name: "E2E User",
        passwordHash: await bcrypt.hash(PASSWORD, 10),
        locale: appLocale,
        onboardedAt: new Date(),
      },
      select: { id: true, email: true },
    });
    await login(page, appLocale, user.email);
    await use(user);
  },
});

export { expect };
