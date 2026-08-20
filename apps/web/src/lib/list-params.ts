/**
 * The shape every list screen shares: search, one filter tab, one sort column,
 * a direction, and a page.
 *
 * List state lives in the URL, so every value arrives as an untrusted string.
 * `makeListParams` builds the parse/serialize pair for a concrete list from its
 * whitelists — nothing reaches Prisma that isn't one of the values declared here.
 *
 * Safe to import from client components: no Prisma, no server-only APIs.
 */

export const LIST_PAGE_SIZES = [10, 20, 50] as const;

/**
 * The query keys a list owns. Everything else in the URL belongs to the page —
 * the reports screen keeps its `tab` and `customer` there — so `useListParams`
 * carries the rest through untouched instead of serializing over them.
 */
export const LIST_PARAM_KEYS = new Set([
  "q",
  "filter",
  "sort",
  "dir",
  "per",
  "page",
]);

export type ListParams<F extends string, S extends string> = {
  q: string;
  filter: F;
  sort: S;
  dir: "asc" | "desc";
  page: number;
  per: number;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

export function makeListParams<F extends string, S extends string>(cfg: {
  filters: readonly F[];
  sorts: readonly S[];
  defaults: ListParams<F, S>;
}) {
  const { filters, sorts, defaults } = cfg;

  function parse(sp: RawSearchParams): ListParams<F, S> {
    const filter = first(sp.filter);
    const sort = first(sp.sort);
    const dir = first(sp.dir);
    const per = Number(first(sp.per));
    const page = Number(first(sp.page));

    return {
      q: (first(sp.q) ?? "").trim().slice(0, 100),
      filter: filters.includes(filter as F) ? (filter as F) : defaults.filter,
      sort: sorts.includes(sort as S) ? (sort as S) : defaults.sort,
      // Falls back to the list's own default, not a fixed "desc": `toQuery`
      // omits the default, so a URL with no `dir` must parse back to it.
      dir: dir === "asc" || dir === "desc" ? dir : defaults.dir,
      per: (LIST_PAGE_SIZES as readonly number[]).includes(per)
        ? per
        : defaults.per,
      page: Number.isInteger(page) && page > 0 ? page : 1,
    };
  }

  /** Serialize back to a query string, omitting anything still at its default. */
  function toQuery(p: ListParams<F, S>): string {
    const qs = new URLSearchParams();
    if (p.q) qs.set("q", p.q);
    if (p.filter !== defaults.filter) qs.set("filter", p.filter);
    if (p.sort !== defaults.sort) qs.set("sort", p.sort);
    if (p.dir !== defaults.dir) qs.set("dir", p.dir);
    if (p.per !== defaults.per) qs.set("per", String(p.per));
    if (p.page !== 1) qs.set("page", String(p.page));
    return qs.toString();
  }

  return { parse, toQuery };
}
