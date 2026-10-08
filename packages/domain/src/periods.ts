import { computeOwedAgorot } from "./order";

/**
 * Time buckets for the dashboard and Reports. They are computed here, in JS,
 * and never in SQL: the schema stays portable (no DB date functions, ADR
 * 0002). Days and weeks are local time; a week starts on Monday, as the sales
 * table's weeks do.
 */

/** A day as "YYYY-MM-DD" in local time (`toISOString` would shift it to UTC). */
export function isoDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

/** Calendar days, so a daylight-saving change can't make a day 23 hours. */
export function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

/** The Monday that starts the week a date falls in, at midnight. */
export function weekStart(d: Date): Date {
  const start = startOfDay(d);
  return addDays(start, -((start.getDay() + 6) % 7));
}

/** Whole calendar days from `from` to `now`: 0 on the same day. */
export function daysBetween(from: Date, now: Date): number {
  return Math.round(
    (startOfDay(now).getTime() - startOfDay(from).getTime()) / 86_400_000,
  );
}

/** How long an open Order has been open: up to two weeks, up to 30 days, longer. */
export type OrderAge = "fresh" | "aging" | "old";

export function orderAge(createdAt: Date, now: Date): OrderAge {
  const days = daysBetween(createdAt, now);
  return days <= 14 ? "fresh" : days <= 30 ? "aging" : "old";
}

/**
 * Counts per day over the last `days` days, today included, oldest first.
 * Dates outside the window are ignored.
 */
export function dailyCounts(dates: Date[], days: number, now: Date): number[] {
  const counts = new Array<number>(days).fill(0);
  for (const d of dates) {
    const i = days - 1 - daysBetween(d, now);
    if (i >= 0 && i < days) counts[i]! += 1;
  }
  return counts;
}

export type SalesPoint = {
  /** The period's first day, "YYYY-MM-DD" */
  start: string;
  /** Agorot ordered: totals of the Orders created in the period */
  ordered: number;
  /** Agorot collected: Payments made in the period */
  collected: number;
};

/**
 * Ordered and collected for each of the last `weeks` weeks, this one
 * included, oldest first. Every week is present, zeros too.
 */
export function weeklySales({
  orders,
  payments,
  weeks,
  now,
}: {
  orders: { createdAt: Date; totalAgorot: number }[];
  payments: { paidAt: Date; amountAgorot: number }[];
  weeks: number;
  now: Date;
}): SalesPoint[] {
  const first = addDays(weekStart(now), -7 * (weeks - 1));
  const points = Array.from({ length: weeks }, (_, i) => ({
    start: isoDay(addDays(first, 7 * i)),
    ordered: 0,
    collected: 0,
  }));
  const at = (d: Date) => Math.floor(daysBetween(first, d) / 7);
  for (const o of orders) {
    const p = points[at(o.createdAt)];
    if (p && o.createdAt >= first) p.ordered += o.totalAgorot;
  }
  for (const pay of payments) {
    const p = points[at(pay.paidAt)];
    if (p && pay.paidAt >= first) p.collected += pay.amountAgorot;
  }
  return points;
}

export type DebtPoint = {
  /** The week's first day, "YYYY-MM-DD" */
  start: string;
  /** Balance due when the week ended (for this week: now) */
  debt: number;
};

/**
 * The total Balance due at the end of each of the last `weeks` weeks, oldest
 * first. Each Order counts from the moment it was created, less the Payments
 * made on it by then, and never below zero: an overpaid Order is settled, not
 * a credit against the others. An Order's total is taken as it is now.
 */
export function debtAtWeekEnds({
  orders,
  payments,
  weeks,
  now,
}: {
  orders: { id: string; createdAt: Date; totalAgorot: number }[];
  payments: { orderId: string; paidAt: Date; amountAgorot: number }[];
  weeks: number;
  now: Date;
}): DebtPoint[] {
  const first = addDays(weekStart(now), -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(first, 7 * i);
    const end = i === weeks - 1 ? now : addDays(start, 7);
    const paid = new Map<string, number>();
    for (const p of payments) {
      if (p.paidAt < end) paid.set(p.orderId, (paid.get(p.orderId) ?? 0) + p.amountAgorot);
    }
    let debt = 0;
    for (const o of orders) {
      if (o.createdAt < end) debt += computeOwedAgorot(o.totalAgorot, paid.get(o.id) ?? 0);
    }
    return { start: isoDay(start), debt };
  });
}
