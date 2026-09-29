import type { Page } from "@playwright/test";

import type { T } from "./i18n.ts";

/**
 * The app shell every suite shares: the sidebar and its user menu. On a
 * phone the sidebar is a sheet, opened from the header first.
 */
export class AppShell {
  constructor(
    private page: Page,
    private t: T,
  ) {}

  private async sidebar() {
    if (this.page.viewportSize()!.width < 768) {
      await this.page.getByRole("button", { name: "Toggle Sidebar" }).click();
    }
  }

  async openUserMenu(email: string) {
    await this.sidebar();
    await this.page.getByRole("button").filter({ hasText: email }).click();
  }

  async signOut(email: string) {
    await this.openUserMenu(email);
    await this.page.getByRole("menuitem", { name: this.t("nav.signOut") }).click();
  }

  async goToNav(key: "dashboard" | "orders" | "customers" | "catalog" | "reports") {
    await this.sidebar();
    await this.page.getByRole("link", { name: this.t(`nav.${key}`) }).click();
  }
}
