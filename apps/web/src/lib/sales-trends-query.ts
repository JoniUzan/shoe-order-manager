import { prisma } from "@repo/db";
import {
  addDays,
  debtAtWeekEnds,
  weekStart,
  weeklySales,
  type DebtPoint,
  type SalesPoint,
} from "@repo/domain";

/**
 * The charts on Reports › Sales, over the last 13 weeks (about 3 months):
 * ordered vs collected per week, the best-selling Shoe models in pairs, the
 * biggest Customers in ₪, and the Balance due as it stood at each week's end.
 *
 * Server-only (imports `prisma`). Client components may import the *types*.
 */

export const TREND_WEEKS = 13;
/** Rows in each ranking. */
export const TOP_SHOWN = 6;

export type SalesTrends = {
  weeks: SalesPoint[];
  debt: DebtPoint[];
  topModels: { id: string; name: string; pairs: number }[];
  topCustomers: { id: string; name: string; orderedAgorot: number }[];
};

export async function loadSalesTrends(
  ownerId: string,
  now: Date = new Date(),
): Promise<SalesTrends> {
  const start = addDays(weekStart(now), -7 * (TREND_WEEKS - 1));

  const [windowOrders, windowPayments, debtOrders, modelGroups, customerGroups] =
    await Promise.all([
      prisma.order.findMany({
        where: { ownerId, createdAt: { gte: start } },
        select: { createdAt: true, totalAgorot: true },
      }),
      prisma.payment.findMany({
        where: { ownerId, paidAt: { gte: start } },
        select: { paidAt: true, amountAgorot: true },
      }),
      // Every Order that owed something at some point in the window: created
      // in it, still owing now, or paid on during it. An Order settled before
      // the window adds nothing to any week, so it's left unread.
      prisma.order.findMany({
        where: {
          ownerId,
          OR: [
            { createdAt: { gte: start } },
            { paymentStatus: { not: "paid" } },
            { payments: { some: { paidAt: { gte: start } } } },
          ],
        },
        select: {
          id: true,
          createdAt: true,
          totalAgorot: true,
          payments: { select: { paidAt: true, amountAgorot: true } },
        },
      }),
      prisma.orderItem.groupBy({
        by: ["shoeModelId"],
        where: {
          shoeModelId: { not: null },
          order: { ownerId, createdAt: { gte: start } },
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: TOP_SHOWN,
      }),
      prisma.order.groupBy({
        by: ["customerId"],
        where: { ownerId, createdAt: { gte: start } },
        _sum: { totalAgorot: true },
        orderBy: { _sum: { totalAgorot: "desc" } },
        take: TOP_SHOWN,
      }),
    ]);

  const [models, customers] = await Promise.all([
    prisma.shoeModel.findMany({
      where: { ownerId, id: { in: modelGroups.map((g) => g.shoeModelId!) } },
      select: { id: true, name: true },
    }),
    prisma.customer.findMany({
      where: { ownerId, id: { in: customerGroups.map((g) => g.customerId) } },
      select: { id: true, name: true },
    }),
  ]);
  const modelName = new Map(models.map((m) => [m.id, m.name]));
  const customerName = new Map(customers.map((c) => [c.id, c.name]));

  return {
    weeks: weeklySales({
      orders: windowOrders,
      payments: windowPayments,
      weeks: TREND_WEEKS,
      now,
    }),
    debt: debtAtWeekEnds({
      orders: debtOrders,
      payments: debtOrders.flatMap((o) =>
        o.payments.map((p) => ({ orderId: o.id, ...p })),
      ),
      weeks: TREND_WEEKS,
      now,
    }),
    topModels: modelGroups
      .filter((g) => modelName.has(g.shoeModelId!))
      .map((g) => ({
        id: g.shoeModelId!,
        name: modelName.get(g.shoeModelId!)!,
        pairs: g._sum.quantity ?? 0,
      })),
    topCustomers: customerGroups
      .filter((g) => customerName.has(g.customerId))
      .map((g) => ({
        id: g.customerId,
        name: customerName.get(g.customerId)!,
        orderedAgorot: g._sum.totalAgorot ?? 0,
      })),
  };
}
