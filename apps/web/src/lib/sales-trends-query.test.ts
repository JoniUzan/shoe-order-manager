import { prisma } from "@repo/db";
import { addDays } from "@repo/domain";
import { describe, expect, it } from "vitest";

import { createCustomer, createModel, createUser } from "../../test/factories";

import { loadSalesTrends, TREND_WEEKS } from "./sales-trends-query";

// Wednesday 7 October 2026, mid-afternoon, local time.
const NOW = new Date(2026, 9, 7, 15, 30);

let number = 0;
function order(
  ownerId: string,
  customerId: string,
  daysAgo: number,
  totalAgorot: number,
  items: { shoeModelId: string; quantity: number }[] = [],
) {
  return prisma.order.create({
    data: {
      ownerId,
      customerId,
      orderNumber: ++number,
      totalAgorot,
      createdAt: addDays(NOW, -daysAgo),
      items: { create: items.map((i) => ({ ...i, size: "40" })) },
    },
  });
}

describe("loadSalesTrends", () => {
  it("ranks models by pairs and Customers by ₪, and tracks the debt, for this User only", async () => {
    const user = await createUser();
    const shop = await createCustomer(user.id, "Shop");
    const boutique = await createCustomer(user.id, "Boutique");
    const runner = await createModel(user.id);
    const sandal = await prisma.shoeModel.create({
      data: { ownerId: user.id, name: "Sandal", sizes: "40", defaultPriceAgorot: 0 },
    });

    await order(user.id, shop.id, 2, 1000, [{ shoeModelId: runner.id, quantity: 3 }]);
    await order(user.id, boutique.id, 9, 5000, [
      { shoeModelId: sandal.id, quantity: 8 },
      { shoeModelId: runner.id, quantity: 2 },
    ]);
    // Before the window: not ranked, but still owed, so it's in the debt.
    await order(user.id, shop.id, 200, 700, [{ shoeModelId: sandal.id, quantity: 50 }]);
    const paid = await order(user.id, shop.id, 9, 400);
    await prisma.payment.create({
      data: { ownerId: user.id, orderId: paid.id, amountAgorot: 400, paidAt: addDays(NOW, -1) },
    });

    const other = await createUser();
    const theirs = await createCustomer(other.id);
    await order(other.id, theirs.id, 1, 99_999);

    const trends = await loadSalesTrends(user.id, NOW);

    expect(trends.topModels).toEqual([
      { id: sandal.id, name: "Sandal", pairs: 8 },
      { id: runner.id, name: "Runner", pairs: 5 },
    ]);
    expect(trends.topCustomers).toEqual([
      { id: boutique.id, name: "Boutique", orderedAgorot: 5000 },
      { id: shop.id, name: "Shop", orderedAgorot: 1400 },
    ]);
    expect(trends.weeks).toHaveLength(TREND_WEEKS);
    expect(trends.weeks.at(-1)).toMatchObject({ ordered: 1000, collected: 400 });
    // Last week ended owing 700 + 5000 + 400; by now the 400 is paid and 1000 added.
    expect(trends.debt.slice(-2).map((d) => d.debt)).toEqual([6100, 6700]);
  });
});
