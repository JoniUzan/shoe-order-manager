import type { Page } from "@playwright/test";

import type { T } from "../../fixtures/index.ts";

type Tab = "owed" | "customers" | "sales";

/** The reports page: one tab at a time, each a table. */
export class ReportsPage {
  constructor(
    private page: Page,
    private t: T,
  ) {}

  async goto(locale: string, tab: Tab = "owed") {
    await this.page.goto(`/${locale}/reports${tab === "owed" ? "" : `?tab=${tab}`}`);
  }

  tab(tab: Tab) {
    const key = { owed: "tabOwed", customers: "tabByCustomer", sales: "tabSales" }[tab];
    return this.page.getByRole("link", { name: this.t(`reports.${key}`) });
  }

  row(text: string) {
    return this.page.getByRole("row").filter({ hasText: text });
  }

  owedEmpty() {
    return this.page.getByText(this.t("reports.owedEmpty"));
  }
}
