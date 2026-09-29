import type { Page } from "@playwright/test";

import type { T } from "../../fixtures/index.ts";
import { AppShell } from "../../fixtures/shell.ts";

type Section = "general" | "account" | "business";
type BusinessField = "businessName" | "businessPhone" | "businessAddress" | "businessTaxId";

/** The phone menu's row for each section; the computer nav names them plainly. */
const PHONE_ROW: Record<Section, string> = {
  account: "settings.profileRow",
  general: "settings.themeRow",
  business: "settings.businessDetails",
};

/** The settings dialog, in the URL hash over any page (ADR 0005). */
export class SettingsDialog {
  constructor(
    private page: Page,
    private t: T,
  ) {}

  /** Open it the way a user does: user menu → Settings → the section. */
  async open(locale: string, email: string, section: Section) {
    await this.page.goto(`/${locale}`);
    await new AppShell(this.page, this.t).openUserMenu(email);
    await this.page.getByRole("menuitem", { name: this.t("nav.settings") }).click();
    const phone = this.page.viewportSize()!.width < 768;
    const label = this.t(phone ? PHONE_ROW[section] : `settings.nav.${section}`);
    await this.page.getByRole("link", { name: label }).click();
    await this.page.waitForURL(new RegExp(`#settings/${section}$`));
  }

  /**
   * Open it by a link that carries the hash (`/he/orders#settings/business`).
   * From the same page (the Dashboard, where login lands) only the hash
   * changes: a fragment navigation, not a page load.
   */
  async openByLink(locale: string, section: Section, path = "") {
    await this.page.goto(`/${locale}${path}#settings/${section}`);
  }

  /** Account → name. Saves on leaving the field. */
  nameField() {
    return this.page.locator("#settings-name");
  }

  /**
   * The Dashboard's greeting behind the dialog (a User with no customers or
   * models yet), redrawn by the refresh after a save.
   */
  dashboardGreeting(name: string) {
    return this.page.getByText(this.t("dashboard.getStartedTitleNamed", { name }));
  }

  /**
   * Pick an Avatar in the orb carousel. Orbs off to the side are clipped, so
   * this steps with the arrow keys (the carousel wraps) as a keyboard user
   * would, instead of clicking one that isn't really on screen.
   */
  async pickAvatar(code: string, index: number) {
    const label = `${String(index + 1).padStart(2, "0")} · ${this.t(`avatars.${code}`)}`;
    const group = this.page.getByRole("radiogroup", { name: this.t("onboarding.avatarLabel") });
    const target = group.getByRole("radio", { name: label });
    await group.locator('[aria-checked="true"]').focus();
    for (let i = 0; i < 11 && (await target.getAttribute("aria-checked")) !== "true"; i++) {
      await this.page.keyboard.press("ArrowRight");
    }
  }

  /** General → theme, a segmented control of radio labels. */
  async pickTheme(theme: "light" | "dark" | "system") {
    await this.page.getByTitle(this.t(`theme.${theme}`)).click();
  }

  /** General → language. Switching reloads the page in the new locale. */
  async pickLanguage(label: string) {
    await this.page.getByRole("combobox", { name: this.t("settings.language") }).click();
    await this.page.getByRole("option", { name: label }).click();
  }

  /** Account → password → Change, then fill the dialog and submit. */
  async changePassword(current: string, next: string) {
    // Email and password each have a "Change"; password is the second.
    await this.page.getByRole("button", { name: this.t("settings.change") }).last().click();
    const dialog = this.page.getByRole("dialog").filter({ has: this.page.locator("#pw-current") });
    await dialog.locator("#pw-current").fill(current);
    await dialog.locator("#pw-new").fill(next);
    await dialog.locator("#pw-confirm").fill(next);
    await dialog.getByRole("button", { name: this.t("settings.changePassword") }).click();
  }

  wrongPassword() {
    return this.page.getByText(this.t("settings.errors.wrongPassword"));
  }

  passwordSaved() {
    return this.page.getByText(this.t("settings.passwordSaved"));
  }

  businessField(field: BusinessField) {
    return this.page.locator(`#settings-${field}`);
  }

  /** Type a value and leave the field, which saves it. */
  async fillAndLeave(field: BusinessField, value: string) {
    await this.businessField(field).fill(value);
    await this.businessField(field).press("Enter");
  }
}
