import type { Page } from "@playwright/test";

import type { T } from "../../fixtures/index.ts";

export class SignupPage {
  constructor(
    private page: Page,
    private t: T,
  ) {}

  async goto(locale: string) {
    await this.page.goto(`/${locale}/signup`);
  }

  async signUp(name: string, email: string, password: string) {
    await this.page.fill("#signup-name", name);
    await this.page.fill("#signup-email", email);
    await this.page.fill("#signup-password", password);
    await this.page.getByRole("button", { name: this.t("auth.createAccount") }).click();
  }
}

/** The Onboarding dialog after Sign-up: Language, Make it yours, Business. */
export class WelcomeDialog {
  constructor(
    private page: Page,
    private t: T,
  ) {}

  root() {
    return this.page.getByRole("dialog");
  }

  step(n: number) {
    return this.root().getByText(this.t("onboarding.stepOf", { step: n, total: 3 }));
  }

  async continue() {
    await this.root().getByRole("button", { name: this.t("onboarding.continue") }).click();
  }

  async finish() {
    await this.root().getByRole("button", { name: this.t("onboarding.finish") }).click();
  }

  businessName() {
    return this.root().locator("#welcome-businessName");
  }

  businessNameMissing() {
    return this.root().getByText(this.t("onboarding.businessNameMissing"));
  }
}
