import { prisma } from "@repo/db";

import {
  LIST_PAGE_SIZES,
  makeListParams,
  type ListParams,
  type RawSearchParams,
} from "@/lib/list-params";
import { imageUrl } from "@/lib/storage";

/**
 * "A page of one order's line items."
 *
 * Sorted and paged in JS rather than by Prisma, for two reasons that both point
 * the same way: the line total is `unitPrice * quantity`, derived in app code
 * and never stored, so there is no column to order by; and a size is text
 * ("42", "42.5", "US 9") that sorts numerically only if something parses it
 * first. The set is one order's items, so it is small by construction.
 *
 * Server-only (imports `prisma`). Client components may import the *types*.
 */

/**
 * A line is a catalog reference XOR free text, which is the one real division
 * in the set — so it is what the filter tabs offer.
 */
export const ORDER_ITEM_FILTERS = ["all", "catalog", "custom"] as const;
export type OrderItemFilter = (typeof ORDER_ITEM_FILTERS)[number];

export const ORDER_ITEM_SORTS = [
  "name",
  "size",
  "quantity",
  "unitPrice",
  "lineTotal",
] as const;
export type OrderItemSort = (typeof ORDER_ITEM_SORTS)[number];

export const ORDER_ITEM_PAGE_SIZES = LIST_PAGE_SIZES;

export type OrderItemListParams = ListParams<OrderItemFilter, OrderItemSort>;

export const ORDER_ITEM_LIST_DEFAULTS: OrderItemListParams = {
  q: "",
  filter: "all",
  // The order the lines were entered in is the order they were read out in.
  sort: "name",
  dir: "asc",
  page: 1,
  per: 20,
};

export type OrderItemRow = {
  id: string;
  /** The model's name, or the free-text description for a custom line. */
  name: string;
  /** Null for a custom line — the table marks those. */
  shoeModelId: string | null;
  /** Needed to format the size the way the model expresses it. */
  sizeFormat: string | null;
  /** The model's Product image; null for a custom line or a model without one. */
  imageUrl: string | null;
  size: string;
  color: string | null;
  material: string | null;
  sole: string | null;
  quantity: number;
  unitPriceAgorot: number;
  lineTotalAgorot: number;
};

export type OrderItemListResult = {
  rows: OrderItemRow[];
  total: number;
  /**
   * How many lines the order has before any filter — what decides whether the
   * table is worth a toolbar. `total` moves with the filter, so keying off it
   * would make the controls vanish under the filter still being applied.
   */
  totalUnfiltered: number;
  pageCount: number;
  params: OrderItemListParams;
};

const itemParams = makeListParams({
  filters: ORDER_ITEM_FILTERS,
  sorts: ORDER_ITEM_SORTS,
  defaults: ORDER_ITEM_LIST_DEFAULTS,
});

export function parseOrderItemListParams(
  sp: RawSearchParams,
): OrderItemListParams {
  return itemParams.parse(sp);
}

/** Serialize back to a query string, omitting anything still at its default. */
export function orderItemListToQuery(p: OrderItemListParams): string {
  return itemParams.toQuery(p);
}

/**
 * Sizes are text but read as numbers. "42.5" must fall between "42" and "43",
 * and "US 9" must not sort as though it began with a letter and nothing else.
 */
function sizeRank(size: string): number {
  const n = Number.parseFloat(size.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

export async function listOrderItems(
  ownerId: string,
  orderId: string,
  params: OrderItemListParams,
): Promise<OrderItemListResult> {
  // Scoped through the order's owner, so an item can never be read by way of
  // an orderId belonging to somebody else.
  const items = await prisma.orderItem.findMany({
    where: { orderId, order: { ownerId } },
    orderBy: { id: "asc" },
    select: {
      id: true,
      shoeModelId: true,
      customDescription: true,
      size: true,
      color: true,
      material: true,
      sole: true,
      quantity: true,
      unitPriceAgorot: true,
      shoeModel: { select: { name: true, sizeFormat: true, imageKey: true } },
    },
  });

  let rows: OrderItemRow[] = items.map((it) => ({
    id: it.id,
    name: it.shoeModel?.name ?? it.customDescription ?? "",
    shoeModelId: it.shoeModelId,
    sizeFormat: it.shoeModel?.sizeFormat ?? null,
    imageUrl: imageUrl(it.shoeModel?.imageKey),
    size: it.size,
    color: it.color,
    material: it.material,
    sole: it.sole,
    quantity: it.quantity,
    unitPriceAgorot: it.unitPriceAgorot,
    lineTotalAgorot: it.unitPriceAgorot * it.quantity,
  }));

  if (params.filter === "catalog")
    rows = rows.filter((r) => r.shoeModelId !== null);
  if (params.filter === "custom")
    rows = rows.filter((r) => r.shoeModelId === null);

  if (params.q) {
    const needle = params.q.toLowerCase();
    rows = rows.filter((r) =>
      [r.name, r.size, r.color ?? "", r.material ?? "", r.sole ?? ""].some((v) =>
        v.toLowerCase().includes(needle),
      ),
    );
  }

  const sign = params.dir === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    const primary =
      params.sort === "size"
        ? sizeRank(a.size) - sizeRank(b.size)
        : params.sort === "quantity"
          ? a.quantity - b.quantity
          : params.sort === "unitPrice"
            ? a.unitPriceAgorot - b.unitPriceAgorot
            : params.sort === "lineTotal"
              ? a.lineTotalAgorot - b.lineTotalAgorot
              : a.name.localeCompare(b.name);
    // Ids are stable and unique, so equal rows keep a fixed order across pages.
    return primary !== 0 ? primary * sign : a.id.localeCompare(b.id);
  });

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / params.per));
  const page = total > 0 && params.page > pageCount ? pageCount : params.page;
  const start = (page - 1) * params.per;

  return {
    rows: rows.slice(start, start + params.per),
    total,
    totalUnfiltered: items.length,
    pageCount,
    params: page === params.page ? params : { ...params, page },
  };
}
