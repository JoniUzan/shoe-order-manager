---
name: browser-check
description: Verify a flow in this app by driving real Chrome with playwright-core. Use after changing a page, form, navigation or the settings dialog, or when asked to check, test or screenshot something in the running app.
---

# Browser check

Typecheck and build miss client-navigation, hydration and form bugs; this drives the actual UI.
The check is done when every step of the flow you changed has run in Chrome and you have
reported what you saw.

## 1. Make sure the app is up

1. Postgres: `docker compose ps` shows `db` running. If not, `docker compose up -d`.
2. Data: a fresh database needs `pnpm db:migrate` and `pnpm db:seed` (the seed is idempotent).
3. Dev server: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/he/login` gives
   `200`. If not, start `pnpm dev` in the background, wait for `200`, and stop it at the end
   since you started it. Leave a server the user started running.

## 2. Write the script

Create `browser-check-<flow>.mjs` at the **repo root** (that's where `playwright-core`
resolves). Start from this and add the steps for the flow under test:

```js
import { chromium } from "playwright-core";

const BASE = "http://localhost:3000";
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
// next-themes' inline <script> warns in dev on every page; it is not a bug.
const known = (text) => text.startsWith("Encountered a script tag");
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && !known(m.text()) && errors.push(m.text()));

// Log in as the seeded admin.
await page.goto(`${BASE}/he/login`);
await page.fill("#email", process.env.ADMIN_EMAIL ?? "admin@example.com");
await page.fill("#password", process.env.ADMIN_PASSWORD ?? "changeme123");
await page.click('button[type="submit"]');
await page.waitForURL((url) => !url.pathname.endsWith("/login"));

try {
  // --- the flow under test ---
  // Detail URLs are cuids: match /orders\/c[a-z0-9]{16,}$/ so /orders/new doesn't count.
  // caret: "initial": the default hides the caret with an injected style, which React
  // then reports as a hydration mismatch.
  await page.screenshot({ path: "browser-check-result.png", fullPage: true, caret: "initial" });
} finally {
  console.log(errors.length ? `ERRORS:\n${errors.join("\n")}` : "no page errors");
  await browser.close();
}
```

- Cover both locales when the change has text or layout (`/he` is RTL, `/en` is LTR), and a
  phone viewport (`{ width: 390, height: 844 }`) when it touches a dialog, drawer or sidebar.
- After a submit, wait for the resulting URL or text rather than a fixed timeout.
- Settings is opened by the hash: `page.goto(`${BASE}/he#settings/account`)`.

## 3. Run, look, clean up

1. `node browser-check-<flow>.mjs`. On failure, fix the script or the app and run again.
2. Read the screenshots with the Read tool and check them against what the change should show.
3. Delete the script and its screenshots; none of them are committed.
4. Report which flows ran, in which locales and viewports, and any page errors.
