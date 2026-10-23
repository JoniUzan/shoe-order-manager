import type { Page } from "@playwright/test";

import type { T } from "./i18n.ts";

/**
 * The app shell every suite shares: the sections and the user menu. On a
 * computer both are in the sidebar; on a phone the sections are the tab bar
 * and the user menu opens from the avatar in the header.
 */
export class AppShell {
  constructor(
    private page: Page,
    private t: T,
  ) {}

  private isPhone() {
    return this.page.viewportSize()!.width < 768;
  }

  async openUserMenu(email: string) {
    if (this.isPhone()) {
      await this.page.getByRole("button", { name: this.t("nav.account") }).click();
    } else {
      await this.page.getByRole("button").filter({ hasText: email }).click();
    }
  }

  async signOut(email: string) {
    await this.openUserMenu(email);
    await this.page.getByRole("menuitem", { name: this.t("nav.signOut") }).click();
  }

  async goToNav(key: "dashboard" | "orders" | "customers" | "catalog" | "reports") {
    await this.page.getByRole("link", { name: this.t(`nav.${key}`), exact: true }).click();
  }

  /** The section's name in the header, which follows the URL. */
  title() {
    return this.page.getByRole("heading", { level: 1 });
  }
}
