import { expect, test } from "../../fixtures/index.ts";

import { ReportsPage } from "./locators.ts";
import { customerOwing700 } from "./setup.ts";

test("with nothing owed, the report says so", async ({ page, t, appLocale, user }) => {
  const reports = new ReportsPage(page, t);
  await reports.goto(appLocale);
  await expect(reports.owedEmpty()).toBeVisible();
  expect(user.id).toBeTruthy();
});

test("who owes lists the Customer's Balance; sales shows the order", async ({ page, t, appLocale, user }) => {
  const customer = await customerOwing700(user.id);
  const reports = new ReportsPage(page, t);

  await reports.goto(appLocale);
  await expect(reports.row(customer.name)).toContainText("700.00");

  await reports.tab("sales").click();
  await expect(page).toHaveURL(/tab=sales/);
  // This month: ₪1,000 sold, ₪300 collected, ₪700 outstanding.
  const month = page.getByRole("row").filter({ hasText: "1,000.00" }).first();
  await expect(month).toContainText("300.00");
  await expect(month).toContainText("700.00");
});

test("sales shows the charts: ranked Customers, and no models for custom items", async ({
  page,
  t,
  appLocale,
  user,
}) => {
  const customer = await customerOwing700(user.id);
  const reports = new ReportsPage(page, t);

  await reports.goto(appLocale, "sales");
  await expect(reports.heading("reports.trendTitle")).toBeVisible();
  await expect(reports.heading("reports.debtTitle")).toBeVisible();
  await expect(reports.rank("reports.topCustomersTitle")).toContainText(customer.name);
  // The only order is a custom item, so no Shoe model has sold.
  await expect(reports.rank("reports.topModelsTitle")).toContainText(t("reports.rankEmpty"));
  expect(user.id).toBeTruthy();
});
