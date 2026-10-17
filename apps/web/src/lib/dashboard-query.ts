import { prisma } from "@repo/db";
import {
  addDays,
  computeOwedAgorot,
  dailyCounts,
  orderAge,
  startOfDay,
  weekStart,
  weeklySales,
  type SalesPoint,
} from "@repo/domain";
import { cache } from "react";

/**
 * What the dashboard shows, one loader per section so each streams on its own
 * (ADR 0012). The dashboard is today's to-do: what's owed, which Orders are
 * still open (status `not_done`), and what came in over the last 7 days.
 * Trends belong to Reports.
 *
 * Server-only (imports `prisma`). Client components may import the *types*.
 */

/** Weeks in the dashboard's small chart. */
export const DASHBOARD_WEEKS = 4;
/** Rows in "who owes money". */
export const OWED_SHOWN = 6;

/** What picks the dashboard's layout: is there anything to show yet. */
export async function loadDashboardCounts(ownerId: string) {
  const [orderCount, customerCount, modelCount] = await Promise.all([
    prisma.order.count({ where: { ownerId } }),
    prisma.customer.count({ where: { ownerId } }),
    prisma.shoeModel.count({ where: { ownerId } }),
  ]);
  return { orderCount, customerCount, modelCount };
}

export type DashboardStats = {
  /** What Customers still owe, split by the Orders' payment status. */
  balanceDue: { totalAgorot: number; unpaidAgorot: number; partialAgorot: number };
  /** Open Orders by how long they've been open: ≤14 days, 15–30, more. */
  open: { count: number; fresh: number; aging: number; old: number };
  /** Orders created in the last 7 days (today included) against the 7 before. */
  recent: {
    count: number;
    orderedAgorot: number;
    previousCount: number;
    /** Orders per day, oldest first, today last. */
    perDay: number[];
  };
};

export type OwedRow = { customerId: string; name: string; owedAgorot: number };

/**
 * The Orders still owing, each with what it owes. The stat cards and "who
 * owes money" both read it: `cache` makes it one query per request.
 */
const owingOrders = cache(async (ownerId: string) => {
  // Bounded by the Orders still owing, which is the set both are about.
  const rows = await prisma.order.findMany({
    where: { ownerId, paymentStatus: { not: "paid" } },
    select: {
      customerId: true,
      paymentStatus: true,
      totalAgorot: true,
      depositAgorot: true,
      customer: { select: { name: true } },
    },
  });
  // Clamped per Order: an overpaid Order is settled, not a credit.
  return rows
    .map((o) => ({ ...o, owed: computeOwedAgorot(o.totalAgorot, o.depositAgorot) }))
    .filter((o) => o.owed > 0);
});

/** The three cards: the balance due, the open Orders, the last 7 days. */
export async function loadDashboardStats(
  ownerId: string,
  now: Date = new Date(),
): Promise<DashboardStats> {
  const today = startOfDay(now);
  const recentStart = addDays(today, -6);
  const previousStart = addDays(today, -13);

  const [owing, openDates, recentOrders] = await Promise.all([
    owingOrders(ownerId),
    prisma.order.findMany({
      where: { ownerId, statusCode: "not_done" },
      select: { createdAt: true },
    }),
    prisma.order.findMany({
      where: { ownerId, createdAt: { gte: previousStart } },
      select: { createdAt: true, totalAgorot: true },
    }),
  ]);

  const balanceDue = { totalAgorot: 0, unpaidAgorot: 0, partialAgorot: 0 };
  for (const o of owing) {
    balanceDue.totalAgorot += o.owed;
    if (o.paymentStatus === "partial") balanceDue.partialAgorot += o.owed;
    else balanceDue.unpaidAgorot += o.owed;
  }

  const open = { count: openDates.length, fresh: 0, aging: 0, old: 0 };
  for (const o of openDates) open[orderAge(o.createdAt, now)] += 1;

  const lastWeek = recentOrders.filter((o) => o.createdAt >= recentStart);

  return {
    balanceDue,
    open,
    recent: {
      count: lastWeek.length,
      orderedAgorot: lastWeek.reduce((sum, o) => sum + o.totalAgorot, 0),
      previousCount: recentOrders.length - lastWeek.length,
      perDay: dailyCounts(
        lastWeek.map((o) => o.createdAt),
        7,
        now,
      ),
    },
  };
}

/** The small chart: ordered and collected over the last few weeks. */
export async function loadDashboardWeeks(
  ownerId: string,
  now: Date = new Date(),
): Promise<SalesPoint[]> {
  const chartStart = addDays(weekStart(now), -7 * (DASHBOARD_WEEKS - 1));
  const [orders, payments] = await Promise.all([
    prisma.order.findMany({
      where: { ownerId, createdAt: { gte: chartStart } },
      select: { createdAt: true, totalAgorot: true },
    }),
    prisma.payment.findMany({
      where: { ownerId, paidAt: { gte: chartStart } },
      select: { paidAt: true, amountAgorot: true },
    }),
  ]);
  return weeklySales({ orders, payments, weeks: DASHBOARD_WEEKS, now });
}

/** "Who owes money": the Customers owing most, most first. */
export async function loadOwed(ownerId: string): Promise<OwedRow[]> {
  const owedBy = new Map<string, OwedRow>();
  for (const o of await owingOrders(ownerId)) {
    const row = owedBy.get(o.customerId) ?? {
      customerId: o.customerId,
      name: o.customer.name,
      owedAgorot: 0,
    };
    row.owedAgorot += o.owed;
    owedBy.set(o.customerId, row);
  }
  return [...owedBy.values()]
    .sort((a, b) => b.owedAgorot - a.owedAgorot || a.customerId.localeCompare(b.customerId))
    .slice(0, OWED_SHOWN);
}
