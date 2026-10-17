import type { Page } from "@playwright/test";

import { streamed, type T } from "../../fixtures/index.ts";

type Tab = "owed" | "customers" | "sales";

/** The reports page: one tab at a time, each a table. */
export class ReportsPage {
  constructor(
    private page: Page,
    private t: T,
  ) {}

  async goto(locale: string, tab: Tab = "owed") {
    await this.page.goto(`/${locale}/reports${tab === "owed" ? "" : `?tab=${tab}`}`);
    await streamed(this.page);
  }

  tab(tab: Tab) {
    const key = { owed: "tabOwed", customers: "tabByCustomer", sales: "tabSales" }[tab];
    return this.page.getByRole("link", { name: this.t(`reports.${key}`) });
  }

  row(text: string) {
    return this.page.getByRole("row").filter({ hasText: text });
  }

  heading(key: string) {
    return this.page.getByRole("heading", { name: this.t(key) });
  }

  /** A ranking card on the sales tab, found by its title. */
  rank(titleKey: string) {
    return this.page.locator("section").filter({ has: this.heading(titleKey) });
  }

  owedEmpty() {
    return this.page.getByText(this.t("reports.owedEmpty"));
  }
}
