import { prisma, type Prisma } from "@repo/db";

import {
  LIST_PAGE_SIZES,
  makeListParams,
  type ListParams,
  type RawSearchParams,
} from "@/lib/list-params";

/**
 * The one definition of "a page of shoe models" — the mirror of
 * `customers-query.ts`.
 *
 * Server-only (imports `prisma`). Client components may import the *types*
 * from here — `import type` is erased, so no client bundle pulls in the client.
 */

export const CATALOG_FILTERS = ["all", "active", "inactive"] as const;
export type CatalogFilter = (typeof CATALOG_FILTERS)[number];

/**
 * Sortable columns — deliberately only the ones the table gives you a header to
 * click. `sizes` is absent because it is a comma-separated string, so ordering
 * by it would sort "10,11" before "9".
 */
export const CATALOG_SORTS = ["name", "sku", "price", "orderLines"] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

export const CATALOG_PAGE_SIZES = LIST_PAGE_SIZES;

export type CatalogListParams = ListParams<CatalogFilter, CatalogSort>;

export const CATALOG_LIST_DEFAULTS: CatalogListParams = {
  q: "",
  filter: "all",
  sort: "name",
  dir: "asc",
  page: 1,
  per: 10,
};

/**
 * A row as the table renders it.
 *
 * Carries more than the visible columns: the quick look reads from the same
 * row, and a model has no detail page to fall back on, so `description`,
 * `sizes` and `sizeFormat` would otherwise be reachable only by opening the
 * edit form. They are small scalar columns on a page-sized result — cheaper
 * than the second round trip a drawer would need without them.
 */
export type CatalogRow = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  defaultPriceAgorot: number | null;
  /** The stored size run, comma-separated — parse with `parseSizes`. */
  sizes: string | null;
  sizeFormat: string;
  isActive: boolean;
  createdAt: string;
  /**
   * How many order lines reference this model. Line items, not distinct orders:
   * that is what the delete action counts when it refuses, so it is the number
   * that explains the refusal.
   */
  orderLines: number;
};

export type CatalogListResult = {
  rows: CatalogRow[];
  total: number;
  pageCount: number;
  /** Echoed back with `page` clamped into range, so the UI can resync. */
  params: CatalogListParams;
};

const catalogParams = makeListParams({
  filters: CATALOG_FILTERS,
  sorts: CATALOG_SORTS,
  defaults: CATALOG_LIST_DEFAULTS,
});

export function parseCatalogListParams(sp: RawSearchParams): CatalogListParams {
  return catalogParams.parse(sp);
}

/** Serialize back to a query string, omitting anything still at its default. */
export function catalogListToQuery(p: CatalogListParams): string {
  return catalogParams.toQuery(p);
}

function buildWhere(
  ownerId: string,
  p: CatalogListParams,
): Prisma.ShoeModelWhereInput {
  const where: Prisma.ShoeModelWhereInput = { ownerId };
  if (p.filter === "active") where.isActive = true;
  if (p.filter === "inactive") where.isActive = false;

  if (p.q) {
    // No `mode: "insensitive"` — Prisma rejects it on the SQLite provider.
    // SQLite's LIKE is already case-insensitive for ASCII, and Hebrew has no
    // case, so a plain `contains` is the correct (and only) option here.
    where.OR = [
      { name: { contains: p.q } },
      { sku: { contains: p.q } },
      { description: { contains: p.q } },
    ];
  }
  return where;
}

function buildOrderBy(
  p: CatalogListParams,
): Prisma.ShoeModelOrderByWithRelationInput[] {
  // `sku` and `defaultPriceAgorot` are both nullable, and SQLite sorts NULLs
  // first ascending. Prisma's `nulls` option is Postgres/MySQL only, so the
  // models missing one land together at the top rather than the bottom.
  const primary: Prisma.ShoeModelOrderByWithRelationInput =
    p.sort === "price"
      ? { defaultPriceAgorot: p.dir }
      : p.sort === "orderLines"
        ? { items: { _count: p.dir } }
        : p.sort === "sku"
          ? { sku: p.dir }
          : { name: p.dir };

  // A stable tiebreaker matters far more with server-side paging than without:
  // without it, rows with equal sort keys can repeat on one page and vanish
  // from the next. Nothing here is unique — two models can share a name, and
  // `sku` is optional — so the id is what fully orders the set.
  return [primary, { id: "asc" }];
}

const ROW_SELECT = {
  id: true,
  name: true,
  sku: true,
  description: true,
  defaultPriceAgorot: true,
  sizes: true,
  sizeFormat: true,
  isActive: true,
  createdAt: true,
  _count: { select: { items: true } },
} satisfies Prisma.ShoeModelSelect;

type RawRow = Prisma.ShoeModelGetPayload<{ select: typeof ROW_SELECT }>;

function toRow(m: RawRow): CatalogRow {
  return {
    id: m.id,
    name: m.name,
    sku: m.sku,
    description: m.description,
    defaultPriceAgorot: m.defaultPriceAgorot,
    sizes: m.sizes,
    sizeFormat: m.sizeFormat,
    isActive: m.isActive,
    createdAt: m.createdAt.toISOString(),
    orderLines: m._count.items,
  };
}

export async function listShoeModels(
  ownerId: string,
  params: CatalogListParams,
): Promise<CatalogListResult> {
  const where = buildWhere(ownerId, params);
  const orderBy = buildOrderBy(params);

  // Returns the PrismaPromise rather than awaiting, so the same definition
  // serves both the transaction below and the clamped re-fetch further down.
  const page = (n: number) =>
    prisma.shoeModel.findMany({
      where,
      select: ROW_SELECT,
      orderBy,
      skip: (n - 1) * params.per,
      take: params.per,
    });

  const [records, total] = await prisma.$transaction([
    page(params.page),
    prisma.shoeModel.count({ where }),
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
