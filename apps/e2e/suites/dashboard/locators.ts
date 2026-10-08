import type { Page } from "@playwright/test";

import type { T } from "../../fixtures/index.ts";

type Card = "cardBalanceDue" | "cardOpenOrders" | "cardRecent";

/** The dashboard: three cards, the chart, who owes, and the open Orders. */
export class DashboardPage {
  constructor(
    private page: Page,
    private t: T,
  ) {}

  async goto(locale: string) {
    await this.page.goto(`/${locale}`);
  }

  /** A card is one link; its name is everything written on it. */
  card(card: Card) {
    return this.page.getByRole("link").filter({ hasText: this.t(`dashboard.${card}`) });
  }

  /** A row of the Orders table at the bottom, by what it shows. */
  orderRow(text: string) {
    return this.page.getByRole("row").filter({ hasText: text });
  }

  filterTab(key: "filterAll" | "filterOpen") {
    return this.page.getByRole("tab", { name: this.t(`orders.${key}`) });
  }

  getStarted() {
    return this.page.getByRole("link", { name: this.t("dashboard.addCustomer") });
  }
}

/** The floating + on every page but the forms, and its menu. */
export class QuickActions {
  constructor(
    private page: Page,
    private t: T,
  ) {}

  button() {
    return this.page.getByRole("button", { name: this.t("quickActions.label") });
  }

  async start(action: "newOrder" | "newCustomer" | "newShoeModel") {
    await this.button().click();
    await this.page.getByRole("menuitem", { name: this.t(`quickActions.${action}`) }).click();
  }
}
