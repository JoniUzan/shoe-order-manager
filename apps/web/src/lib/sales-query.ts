import { prisma } from "@repo/db";

import {
  LIST_PAGE_SIZES,
  makeListParams,
  type ListParams,
  type RawSearchParams,
} from "@/lib/list-params";

/**
 * "A page of sales periods" — the sales report's list definition.
 *
 * The bucketing is deliberately JS, not `date_trunc`/`strftime`: the schema is
 * kept portable for a future Turso/libSQL swap, so no DB date functions. That
 * settles the rest of the shape too — the buckets only exist after the rows are
 * read, so sorting and paging happen over them here.
 *
 * The month/week choice is the list's `filter`, which is what puts it in the
 * table's own tabs alongside every other list on the app.
 *
 * Server-only (imports `prisma`). Client components may import the *types*.
 */

export const SALES_FILTERS = ["month", "week"] as const;
export type SalesFilter = (typeof SALES_FILTERS)[number];

export const SALES_SORTS = [
  "period",
  "orders",
  "gross",
  "collected",
  "outstanding",
] as const;
export type SalesSort = (typeof SALES_SORTS)[number];

export const SALES_PAGE_SIZES = LIST_PAGE_SIZES;

export type SalesListParams = ListParams<SalesFilter, SalesSort>;

export const SALES_LIST_DEFAULTS: SalesListParams = {
  q: "",
  filter: "month",
  // Most recent first: a sales report is read from the present backwards.
  sort: "period",
  dir: "desc",
  page: 1,
  per: 10,
};

export type SalesRow = {
  /** ISO start of the bucket — also its stable id. */
  start: string;
  orders: number;
  grossAgorot: number;
  collectedAgorot: number;
  outstandingAgorot: number;
};

export type SalesListResult = {
  rows: SalesRow[];
  total: number;
  pageCount: number;
  params: SalesListParams;
};

const salesParams = makeListParams({
  filters: SALES_FILTERS,
  sorts: SALES_SORTS,
  defaults: SALES_LIST_DEFAULTS,
});

export function parseSalesListParams(sp: RawSearchParams): SalesListParams {
  return salesParams.parse(sp);
}

/** Serialize back to a query string, omitting anything still at its default. */
export function salesListToQuery(p: SalesListParams): string {
  return salesParams.toQuery(p);
}

/** The start of the bucket a date falls in, in local time. */
function bucketStart(d: Date, period: SalesFilter): Date {
  if (period === "month") return new Date(d.getFullYear(), d.getMonth(), 1);
  const start = new Date(d);
  const dow = (start.getDay() + 6) % 7; // Monday = 0
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - dow);
  return start;
}

export async function listSales(
  ownerId: string,
  params: SalesListParams,
): Promise<SalesListResult> {
  const orders = await prisma.order.findMany({
    where: { ownerId },
    select: { createdAt: true, totalAgorot: true, depositAgorot: true },
  });

  const map = new Map<string, SalesRow>();
  for (const o of orders) {
    const start = bucketStart(o.createdAt, params.filter);
    const key = start.toISOString();
    const row = map.get(key) ?? {
      start: key,
      orders: 0,
      grossAgorot: 0,
      collectedAgorot: 0,
      outstandingAgorot: 0,
    };
    row.orders += 1;
    row.grossAgorot += o.totalAgorot;
    row.collectedAgorot += o.depositAgorot;
    row.outstandingAgorot = row.grossAgorot - row.collectedAgorot;
    map.set(key, row);
  }

  const rows = [...map.values()];

  const sign = params.dir === "asc" ? 1 : -1;
  const at = (r: SalesRow) => Date.parse(r.start);
  rows.sort((a, b) => {
    const primary =
      params.sort === "orders"
        ? a.orders - b.orders
        : params.sort === "gross"
          ? a.grossAgorot - b.grossAgorot
          : params.sort === "collected"
            ? a.collectedAgorot - b.collectedAgorot
            : params.sort === "outstanding"
              ? a.outstandingAgorot - b.outstandingAgorot
              : at(a) - at(b);
    // The bucket start fully orders the set, so it is the tiebreaker too.
    return primary !== 0 ? primary * sign : at(a) - at(b);
  });

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / params.per));
  const page = total > 0 && params.page > pageCount ? pageCount : params.page;
  const start = (page - 1) * params.per;

  return {
    rows: rows.slice(start, start + params.per),
    total,
    pageCount,
    params: page === params.page ? params : { ...params, page },
  };
}
