import type { Locator } from "@playwright/test";

/**
 * The spinner a pending button draws over its label. The order page's own
 * controls come from the payments suite's `PaymentsCard`.
 */
export function spinnerIn(button: Locator) {
  return button.locator('[data-slot="button-spinner"]');
}
