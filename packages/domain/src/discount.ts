/**
 * Percentage discounts applied to an order subtotal.
 */

import { agorotToShekels } from "./money";

/** Apply a percentage discount (e.g. 12.5 for 12.5%) to a subtotal. */
export function applyDiscount(subtotalAgorot: number, percent: number): number {
  const shekels = agorotToShekels(subtotalAgorot);
  const discounted = shekels - (shekels * percent) / 100;
  return discounted * 100;
}

/** The amount saved by a percentage discount, for display next to the total. */
export function discountAmount(subtotalAgorot: number, percent: number): number {
  return agorotToShekels(subtotalAgorot) * (percent / 100) * 100;
}
