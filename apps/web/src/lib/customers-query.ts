import { prisma, type Prisma } from "@repo/db";
import { computeOwedAgorot } from "@repo/domain";

import {
  LIST_PAGE_SIZES,
  makeListParams,
  type ListParams,
  type RawSearchParams,
} from "@/lib/list-params";

/**
 * The one definition of "a page of customers" — the mirror of `orders-query.ts`.
 *
 * Server-only (imports `prisma`). Client components may import the *types*
 * from here — `import type` is erased, so no client bundle pulls in the client.
 */

export const CUSTOMER_FILTERS = ["all", "owing", "hasOrders"] as const;
export type CustomerFilter = (typeof CUSTOMER_FILTERS)[number];

/**
 * Sortable columns. `outstandingAgorot` is deliberately absent: the balance is
 * summed in app code from each order and never stored (the schema stays
 * portable — no generated columns), so there is no column for Prisma to order
 * by. The `owing` filter is the answer to "who owes me" instead.
 */
export const CUSTOMER_SORTS = ["name", "ordersCount", "createdAt"] as const;
export type CustomerSort = (typeof CUSTOMER_SORTS)[number];

export const CUSTOMER_PAGE_SIZES = LIST_PAGE_SIZES;

export type CustomerListParams = ListParams<CustomerFilter, CustomerSort>;

export const CUSTOMER_LIST_DEFAULTS: CustomerListParams = {
  q: "",
  filter: "all",
  sort: "name",
  dir: "asc",
  page: 1,
  per: 10,
};

/** A row as the table renders it: money already reduced to what's displayed. */
export type CustomerRow = {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
  ordersCount: number;
  outstandingAgorot: number;
};

export type CustomerListResult = {
  rows: CustomerRow[];
  total: number;
  pageCount: number;
  /** Echoed back with `page` clamped into range, so the UI can resync. */
  params: CustomerListParams;
};

const customerParams = makeListParams({
  filters: CUSTOMER_FILTERS,
  sorts: CUSTOMER_SORTS,
  defaults: CUSTOMER_LIST_DEFAULTS,
});

export function parseCustomerListParams(
  sp: RawSearchParams,
): CustomerListParams {
  return customerParams.parse(sp);
}

/** Serialize back to a query string, omitting anything still at its default. */
export function customerListToQuery(p: CustomerListParams): string {
  return customerParams.toQuery(p);
}

const UNPAID: Prisma.OrderWhereInput = { paymentStatus: { not: "paid" } };

function buildWhere(
  ownerId: string,
  p: CustomerListParams,
): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = { ownerId };
  if (p.filter === "owing") where.orders = { some: UNPAID };
  if (p.filter === "hasOrders") where.orders = { some: {} };

  if (p.q) {
    // No `mode: "insensitive"` — Prisma rejects it on the SQLite provider.
    // SQLite's LIKE is already case-insensitive for ASCII, and Hebrew has no
    // case, so a plain `contains` is the correct (and only) option here.
    where.OR = [
      { name: { contains: p.q } },
      { contactName: { contains: p.q } },
      { phone: { contains: p.q } },
    ];
  }
  return where;
}

function buildOrderBy(
  p: CustomerListParams,
): Prisma.CustomerOrderByWithRelationInput[] {
  const primary: Prisma.CustomerOrderByWithRelationInput =
    p.sort === "ordersCount"
      ? { orders: { _count: p.dir } }
      : p.sort === "createdAt"
        ? { createdAt: p.dir }
        : { name: p.dir };

  // A stable tiebreaker matters far more with server-side paging than without:
  // without it, rows with equal sort keys can repeat on one page and vanish
  // from the next. Unlike orders there is no unique business key here — two
  // stores can share a name — so the id is what fully orders the set.
  return [primary, { id: "asc" }];
}

const ROW_SELECT = {
  id: true,
  name: true,
  contactName: true,
  phone: true,
  address: true,
  createdAt: true,
  _count: { select: { orders: true } },
  // Bounded to the rows on this page — the balance is derived, so there is
  // nothing to read but the orders themselves.
  orders: {
    where: UNPAID,
    select: { totalAgorot: true, depositAgorot: true },
  },
} satisfies Prisma.CustomerSelect;

type RawRow = Prisma.CustomerGetPayload<{ select: typeof ROW_SELECT }>;

function toRow(c: RawRow): CustomerRow {
  return {
    id: c.id,
    name: c.name,
    contactName: c.contactName,
    phone: c.phone,
    address: c.address,
    createdAt: c.createdAt.toISOString(),
    ordersCount: c._count.orders,
    outstandingAgorot: c.orders.reduce(
      (sum, o) => sum + computeOwedAgorot(o.totalAgorot, o.depositAgorot),
      0,
    ),
  };
}

export async function listCustomers(
  ownerId: string,
  params: CustomerListParams,
): Promise<CustomerListResult> {
  const where = buildWhere(ownerId, params);
  const orderBy = buildOrderBy(params);

  const page = async (n: number) =>
    prisma.customer.findMany({
      where,
      select: ROW_SELECT,
      orderBy,
      skip: (n - 1) * params.per,
      take: params.per,
    });

  const [records, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      select: ROW_SELECT,
      orderBy,
      skip: (params.page - 1) * params.per,
      take: params.per,
    }),
    prisma.customer.count({ where }),
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
