import { prisma, type Prisma } from "@repo/db";
import { computeOwedAgorot } from "@repo/domain";

import {
  LIST_PAGE_SIZES,
  makeListParams,
  type ListParams,
  type RawSearchParams,
} from "@/lib/list-params";

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

export const ORDER_PAGE_SIZES = LIST_PAGE_SIZES;

export type OrderListParams = ListParams<OrderFilter, OrderSort>;

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

const orderParams = makeListParams({
  filters: ORDER_FILTERS,
  sorts: ORDER_SORTS,
  defaults: ORDER_LIST_DEFAULTS,
});

export function parseOrderListParams(sp: RawSearchParams): OrderListParams {
  return orderParams.parse(sp);
}

/** Serialize back to a query string, omitting anything still at its default. */
export function orderListToQuery(p: OrderListParams): string {
  return orderParams.toQuery(p);
}

/**
 * Narrows the list to a subset of what the owner can see. Applied on top of
 * `ownerId`, never instead of it — scoping is a view, not an authorization.
 */
export type OrderListScope = { customerId?: string };

function buildWhere(
  ownerId: string,
  p: OrderListParams,
  scope: OrderListScope = {},
): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = { ownerId };
  if (scope.customerId) where.customerId = scope.customerId;
  if (p.filter === "open") where.statusCode = "not_done";
  if (p.filter === "unpaid") where.paymentStatus = { not: "paid" };

  if (p.q) {
    // Postgres `contains` is case-sensitive, so ask for ILIKE explicitly
    // ("nike" should find "Nike"). Hebrew has no case, so it's unaffected.
    const or: Prisma.OrderWhereInput[] = [
      { customer: { name: { contains: p.q, mode: "insensitive" } } },
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
    balanceAgorot: computeOwedAgorot(o.totalAgorot, o.depositAgorot),
    itemCount: o._count.items,
  };
}

export async function listOrders(
  ownerId: string,
  params: OrderListParams,
  scope?: OrderListScope,
): Promise<OrderListResult> {
  const where = buildWhere(ownerId, params, scope);
  const orderBy = buildOrderBy(params);

  // Returns the PrismaPromise rather than awaiting, so the same definition
  // serves both the transaction below and the clamped re-fetch further down.
  const page = (n: number) =>
    prisma.order.findMany({
      where,
      select: ROW_SELECT,
      orderBy,
      skip: (n - 1) * params.per,
      take: params.per,
    });

  const [records, total] = await prisma.$transaction([
    page(params.page),
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
