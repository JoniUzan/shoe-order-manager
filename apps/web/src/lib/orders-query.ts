import { prisma, type Prisma } from "@repo/db";
import { computeBalanceAgorot } from "@repo/domain";

/**
 * The one definition of "a page of orders".
 *
 * List state lives in the URL, so every value here arrives as an untrusted
 * string. Nothing reaches Prisma without passing through the whitelists below.
 *
 * Server-only (imports `prisma`). Client components may import the *types*
 * from here — `import type` is erased, so no client bundle pulls in the client.
 */

export const ORDER_FILTERS = ["all", "open", "unpaid"] as const;
export type OrderFilter = (typeof ORDER_FILTERS)[number];

/**
 * Sortable columns. `balanceAgorot` is deliberately absent: balance is derived
 * in app code and never stored (the schema stays portable — no generated
 * columns), so there is no column for Prisma to order by. The `unpaid` filter
 * plus sort-by-total covers the "who owes me" question.
 */
export const ORDER_SORTS = [
  "orderNumber",
  "createdAt",
  "customerName",
  "totalAgorot",
] as const;
export type OrderSort = (typeof ORDER_SORTS)[number];

export const ORDER_PAGE_SIZES = [10, 20, 50] as const;

export type OrderListParams = {
  q: string;
  filter: OrderFilter;
  sort: OrderSort;
  dir: "asc" | "desc";
  page: number;
  per: number;
};

export const ORDER_LIST_DEFAULTS: OrderListParams = {
  q: "",
  filter: "all",
  sort: "orderNumber",
  dir: "desc",
  page: 1,
  per: 10,
};

/** A row as the table renders it: money already reduced to what's displayed. */
export type OrderRow = {
  id: string;
  orderNumber: number;
  customerId: string;
  customerName: string;
  createdAt: string;
  statusCode: string;
  paymentStatus: string;
  totalAgorot: number;
  balanceAgorot: number;
  itemCount: number;
};

export type OrderListResult = {
  rows: OrderRow[];
  total: number;
  pageCount: number;
  /** Echoed back with `page` clamped into range, so the UI can resync. */
  params: OrderListParams;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

export function parseOrderListParams(sp: RawSearchParams): OrderListParams {
  const filter = first(sp.filter);
  const sort = first(sp.sort);
  const dir = first(sp.dir);
  const per = Number(first(sp.per));
  const page = Number(first(sp.page));

  return {
    q: (first(sp.q) ?? "").trim().slice(0, 100),
    filter: ORDER_FILTERS.includes(filter as OrderFilter)
      ? (filter as OrderFilter)
      : ORDER_LIST_DEFAULTS.filter,
    sort: ORDER_SORTS.includes(sort as OrderSort)
      ? (sort as OrderSort)
      : ORDER_LIST_DEFAULTS.sort,
    dir: dir === "asc" ? "asc" : "desc",
    per: (ORDER_PAGE_SIZES as readonly number[]).includes(per)
      ? per
      : ORDER_LIST_DEFAULTS.per,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Serialize back to a query string, omitting anything still at its default. */
export function orderListToQuery(p: OrderListParams): string {
  const qs = new URLSearchParams();
  if (p.q) qs.set("q", p.q);
  if (p.filter !== ORDER_LIST_DEFAULTS.filter) qs.set("filter", p.filter);
  if (p.sort !== ORDER_LIST_DEFAULTS.sort) qs.set("sort", p.sort);
  if (p.dir !== ORDER_LIST_DEFAULTS.dir) qs.set("dir", p.dir);
  if (p.per !== ORDER_LIST_DEFAULTS.per) qs.set("per", String(p.per));
  if (p.page !== 1) qs.set("page", String(p.page));
  return qs.toString();
}

function buildWhere(ownerId: string, p: OrderListParams): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = { ownerId };
  if (p.filter === "open") where.statusCode = "not_done";
  if (p.filter === "unpaid") where.paymentStatus = { not: "paid" };

  if (p.q) {
    // No `mode: "insensitive"` — Prisma rejects it on the SQLite provider.
    // SQLite's LIKE is already case-insensitive for ASCII, and Hebrew has no
    // case, so a plain `contains` is the correct (and only) option here.
    const or: Prisma.OrderWhereInput[] = [
      { customer: { name: { contains: p.q } } },
    ];
    const asNumber = Number(p.q);
    if (Number.isInteger(asNumber) && asNumber > 0) {
      or.push({ orderNumber: asNumber });
    }
    where.OR = or;
  }
  return where;
}

function buildOrderBy(
  p: OrderListParams,
): Prisma.OrderOrderByWithRelationInput[] {
  const primary: Prisma.OrderOrderByWithRelationInput =
    p.sort === "customerName"
      ? { customer: { name: p.dir } }
      : p.sort === "createdAt"
        ? { createdAt: p.dir }
        : p.sort === "totalAgorot"
          ? { totalAgorot: p.dir }
          : { orderNumber: p.dir };

  // A stable tiebreaker matters far more with server-side paging than without:
  // without it, rows with equal sort keys can repeat on one page and vanish
  // from the next. orderNumber is unique per owner, so it fully orders the set.
  return p.sort === "orderNumber" ? [primary] : [primary, { orderNumber: "desc" }];
}

const ROW_SELECT = {
  id: true,
  orderNumber: true,
  customerId: true,
  createdAt: true,
  statusCode: true,
  paymentStatus: true,
  totalAgorot: true,
  depositAgorot: true,
  customer: { select: { name: true } },
  _count: { select: { items: true } },
} satisfies Prisma.OrderSelect;

type RawRow = Prisma.OrderGetPayload<{ select: typeof ROW_SELECT }>;

function toRow(o: RawRow): OrderRow {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerId: o.customerId,
    customerName: o.customer.name,
    createdAt: o.createdAt.toISOString(),
    statusCode: o.statusCode,
    paymentStatus: o.paymentStatus,
    totalAgorot: o.totalAgorot,
    balanceAgorot: Math.max(
      0,
      computeBalanceAgorot(o.totalAgorot, o.depositAgorot),
    ),
    itemCount: o._count.items,
  };
}

export async function listOrders(
  ownerId: string,
  params: OrderListParams,
): Promise<OrderListResult> {
  const where = buildWhere(ownerId, params);
  const orderBy = buildOrderBy(params);

  const page = async (n: number) =>
    prisma.order.findMany({
      where,
      select: ROW_SELECT,
      orderBy,
      skip: (n - 1) * params.per,
      take: params.per,
    });

  const [records, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      select: ROW_SELECT,
      orderBy,
      skip: (params.page - 1) * params.per,
      take: params.per,
    }),
    prisma.order.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / params.per));

  // A stale `?page=` (bookmarked, or left over from a wider filter) would
  // otherwise render an empty table over a non-empty result. Re-fetch the last
  // real page instead — one extra query, only in the case that would be broken.
  if (params.page > pageCount && total > 0) {
    const clamped = { ...params, page: pageCount };
    return {
      rows: (await page(pageCount)).map(toRow),
      total,
      pageCount,
      params: clamped,
    };
  }

  return { rows: records.map(toRow), total, pageCount, params };
}
