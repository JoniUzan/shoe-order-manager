import { prisma } from "@repo/db";
import { recentDistinct } from "@repo/domain";

/** How far back the suggestions look: bounded, so the cost never grows with the business. */
export const SUGGESTION_ORDERS = 300;

/** What a block's Color, Material and Sole fields offer, most recently used first. */
export interface ItemSuggestions {
  color: string[];
  material: string[];
  sole: string[];
}

/** The values this User typed on their last orders. */
export async function loadItemSuggestions(ownerId: string): Promise<ItemSuggestions> {
  const orders = await prisma.order.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    take: SUGGESTION_ORDERS,
    select: { items: { select: { color: true, material: true, sole: true } } },
  });
  const items = orders.flatMap((o) => o.items);
  return {
    color: recentDistinct(items.map((i) => i.color)),
    material: recentDistinct(items.map((i) => i.material)),
    sole: recentDistinct(items.map((i) => i.sole)),
  };
}
