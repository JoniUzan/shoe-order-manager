import { prisma } from "@repo/db";
import {
  addDays,
  computeOwedAgorot,
  dailyCounts,
  daysBetween,
  orderAge,
  startOfDay,
  weekStart,
  weeklySales,
  type SalesPoint,
} from "@repo/domain";

/**
 * Everything the dashboard shows, read in one place. The dashboard is today's
 * to-do: what's owed, which Orders are still open (status `not_done`), and
 * what came in over the last 7 days. Trends belong to Reports.
 *
 * Server-only (imports `prisma`). Client components may import the *types*.
 */

/** Weeks in the dashboard's small chart. */
export const DASHBOARD_WEEKS = 4;
/** Rows in the open-orders list, oldest first. */
export const OPEN_ORDERS_SHOWN = 8;
/** Rows in "who owes money". */
export const OWED_SHOWN = 6;

export type OpenOrderRow = {
  id: string;
  orderNumber: number;
  customerName: string;
  createdAt: string;
  daysOpen: number;
  paymentStatus: string;
  totalAgorot: number;
};

export type Dashboard = {
  orderCount: number;
  customerCount: number;
  modelCount: number;
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
  weeks: SalesPoint[];
  owed: { customerId: string; name: string; owedAgorot: number }[];
  openOrders: OpenOrderRow[];
};

export async function loadDashboard(
  ownerId: string,
  now: Date = new Date(),
): Promise<Dashboard> {
  const today = startOfDay(now);
  const recentStart = addDays(today, -6);
  const previousStart = addDays(today, -13);
  const chartStart = addDays(weekStart(now), -7 * (DASHBOARD_WEEKS - 1));
  const openWhere = { ownerId, statusCode: "not_done" };

  const [
    orderCount,
    customerCount,
    modelCount,
    owing,
    openDates,
    openOrders,
    recentOrders,
    chartOrders,
    chartPayments,
  ] = await Promise.all([
    prisma.order.count({ where: { ownerId } }),
    prisma.customer.count({ where: { ownerId } }),
    prisma.shoeModel.count({ where: { ownerId } }),
    // Bounded by the Orders still owing, which is the set the card is about.
    prisma.order.findMany({
      where: { ownerId, paymentStatus: { not: "paid" } },
      select: {
        customerId: true,
        paymentStatus: true,
        totalAgorot: true,
        depositAgorot: true,
        customer: { select: { name: true } },
      },
    }),
    prisma.order.findMany({ where: openWhere, select: { createdAt: true } }),
    prisma.order.findMany({
      where: openWhere,
      orderBy: [{ createdAt: "asc" }, { orderNumber: "asc" }],
      take: OPEN_ORDERS_SHOWN,
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        paymentStatus: true,
        totalAgorot: true,
        customer: { select: { name: true } },
      },
    }),
    prisma.order.findMany({
      where: { ownerId, createdAt: { gte: previousStart } },
      select: { createdAt: true, totalAgorot: true },
    }),
    prisma.order.findMany({
      where: { ownerId, createdAt: { gte: chartStart } },
      select: { createdAt: true, totalAgorot: true },
    }),
    prisma.payment.findMany({
      where: { ownerId, paidAt: { gte: chartStart } },
      select: { paidAt: true, amountAgorot: true },
    }),
  ]);

  const balanceDue = { totalAgorot: 0, unpaidAgorot: 0, partialAgorot: 0 };
  const owedBy = new Map<string, { customerId: string; name: string; owedAgorot: number }>();
  for (const o of owing) {
    // Clamped per Order: an overpaid Order is settled, not a credit.
    const owed = computeOwedAgorot(o.totalAgorot, o.depositAgorot);
    if (owed <= 0) continue;
    balanceDue.totalAgorot += owed;
    if (o.paymentStatus === "partial") balanceDue.partialAgorot += owed;
    else balanceDue.unpaidAgorot += owed;
    const row = owedBy.get(o.customerId) ?? {
      customerId: o.customerId,
      name: o.customer.name,
      owedAgorot: 0,
    };
    row.owedAgorot += owed;
    owedBy.set(o.customerId, row);
  }

  const open = { count: openDates.length, fresh: 0, aging: 0, old: 0 };
  for (const o of openDates) open[orderAge(o.createdAt, now)] += 1;

  const lastWeek = recentOrders.filter((o) => o.createdAt >= recentStart);

  return {
    orderCount,
    customerCount,
    modelCount,
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
    weeks: weeklySales({
      orders: chartOrders,
      payments: chartPayments,
      weeks: DASHBOARD_WEEKS,
      now,
    }),
    owed: [...owedBy.values()]
      .sort((a, b) => b.owedAgorot - a.owedAgorot || a.customerId.localeCompare(b.customerId))
      .slice(0, OWED_SHOWN),
    openOrders: openOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customer.name,
      createdAt: o.createdAt.toISOString(),
      daysOpen: daysBetween(o.createdAt, now),
      paymentStatus: o.paymentStatus,
      totalAgorot: o.totalAgorot,
    })),
  };
}
