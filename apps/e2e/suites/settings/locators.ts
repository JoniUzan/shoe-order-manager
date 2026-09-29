import type { Page } from "@playwright/test";

import type { T } from "../../fixtures/index.ts";

type Section = "general" | "account" | "business";
type BusinessField = "businessName" | "businessPhone" | "businessAddress" | "businessTaxId";

/** The settings dialog, opened by the URL hash over any page (ADR 0005). */
export class SettingsDialog {
  constructor(
    private page: Page,
    private t: T,
  ) {}

  async open(locale: string, section: Section, path = "") {
    await this.page.goto(`/${locale}${path}#settings/${section}`);
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
