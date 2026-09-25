import { prisma } from "@repo/db";
import { computeBalanceAgorot } from "@repo/domain";

import {
  LIST_PAGE_SIZES,
  makeListParams,
  type ListParams,
  type RawSearchParams,
} from "@/lib/list-params";

/**
 * "A page of customers who owe money" — the owed report's list definition.
 *
 * Unlike orders and catalog this cannot be a Prisma query: a row's balance is
 * `total - deposit`, derived in app code and never stored (the schema stays
 * portable — no generated columns), and the report drops rows whose balance is
 * not positive. Summing that per customer has to happen after the rows are
 * read, so the aggregate is built in JS and searched, sorted and paged there —
 * the same trade the sales report already makes for its time buckets.
 *
 * The set it walks is open orders only, which is the report's own subject.
 *
 * Server-only (imports `prisma`). Client components may import the *types*.
 */

export const OWED_FILTERS = ["all"] as const;
export type OwedFilter = (typeof OWED_FILTERS)[number];

export const OWED_SORTS = ["name", "orders", "owed"] as const;
export type OwedSort = (typeof OWED_SORTS)[number];

export const OWED_PAGE_SIZES = LIST_PAGE_SIZES;

export type OwedListParams = ListParams<OwedFilter, OwedSort>;

export const OWED_LIST_DEFAULTS: OwedListParams = {
  q: "",
  filter: "all",
  // The report's question is "who owes me the most", so it opens on the answer.
  sort: "owed",
  dir: "desc",
  page: 1,
  per: 10,
};

export type OwedRow = {
  /** The customer id — the row links to them. */
  id: string;
  name: string;
  /** Open orders carrying a positive balance, not all their orders. */
  orders: number;
  owedAgorot: number;
};

export type OwedListResult = {
  rows: OwedRow[];
  total: number;
  pageCount: number;
  params: OwedListParams;
  /**
   * Owed across every customer, not just this page — the footer states the
   * report's bottom line, which a page of it cannot.
   */
  grandTotalAgorot: number;
};

const owedParams = makeListParams({
  filters: OWED_FILTERS,
  sorts: OWED_SORTS,
  defaults: OWED_LIST_DEFAULTS,
});

export function parseOwedListParams(sp: RawSearchParams): OwedListParams {
  return owedParams.parse(sp);
}

/** Serialize back to a query string, omitting anything still at its default. */
export function owedListToQuery(p: OwedListParams): string {
  return owedParams.toQuery(p);
}

export async function listOwed(
  ownerId: string,
  params: OwedListParams,
): Promise<OwedListResult> {
  const openOrders = await prisma.order.findMany({
    where: { ownerId, paymentStatus: { not: "paid" } },
    select: {
      customerId: true,
      totalAgorot: true,
      depositAgorot: true,
      customer: { select: { name: true } },
    },
  });

  const map = new Map<string, OwedRow>();
  let grandTotalAgorot = 0;
  for (const o of openOrders) {
    const balance = computeBalanceAgorot(o.totalAgorot, o.depositAgorot);
    // A paid-ahead or fully-settled order is not a debt; it would otherwise
    // subtract from what a customer owes on the rest.
    if (balance <= 0) continue;
    grandTotalAgorot += balance;
    const row = map.get(o.customerId) ?? {
      id: o.customerId,
      name: o.customer.name,
      orders: 0,
      owedAgorot: 0,
    };
    row.orders += 1;
    row.owedAgorot += balance;
    map.set(o.customerId, row);
  }

  let rows = [...map.values()];

  if (params.q) {
    // Matches the Prisma-backed lists, which search case-insensitively
    // (`mode: "insensitive"`); Hebrew has no case, so it's unaffected.
    const needle = params.q.toLowerCase();
    rows = rows.filter((r) => r.name.toLowerCase().includes(needle));
  }

  const sign = params.dir === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    const primary =
      params.sort === "name"
        ? a.name.localeCompare(b.name)
        : params.sort === "orders"
          ? a.orders - b.orders
          : a.owedAgorot - b.owedAgorot;
    // A stable tiebreaker, for the same reason the Prisma lists carry one:
    // without it, equal rows can repeat on one page and vanish from the next.
    return primary !== 0 ? primary * sign : a.id.localeCompare(b.id);
  });

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / params.per));
  // A stale `?page=` would otherwise render an empty table over a non-empty
  // result. Clamp rather than 404 — the same recovery the other lists make.
  const page = total > 0 && params.page > pageCount ? pageCount : params.page;
  const start = (page - 1) * params.per;

  return {
    rows: rows.slice(start, start + params.per),
    total,
    pageCount,
    params: page === params.page ? params : { ...params, page },
    grandTotalAgorot,
  };
}
