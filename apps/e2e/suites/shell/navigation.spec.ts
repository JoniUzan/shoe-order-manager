import { AppShell } from "../../fixtures/shell.ts";
import { expect, test } from "../../fixtures/index.ts";

const SECTIONS = [
  ["orders", "/orders"],
  ["customers", "/customers"],
  ["catalog", "/catalog"],
  ["reports", "/reports"],
  ["dashboard", ""],
] as const;

test("every section is one tap away", async ({ page, t, appLocale, user: _ }) => {
  const shell = new AppShell(page, t);
  for (const [key, path] of SECTIONS) {
    await shell.goToNav(key);
    await expect(page).toHaveURL(new RegExp(`/${appLocale}${path}$`));
    await expect(shell.title()).toHaveText(t(`nav.${key}`));
  }
});
