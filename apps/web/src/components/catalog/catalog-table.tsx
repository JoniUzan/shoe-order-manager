"use client";

import { formatMoney } from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
import type { ColumnDef } from "@tanstack/react-table";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { ModelRowActions } from "@/components/catalog/model-row-actions";
import { DataTable } from "@/components/data-table/data-table";
import { SortHeader } from "@/components/data-table/sort-header";
import { useListParams } from "@/components/data-table/use-list-params";
import { Link } from "@/i18n/navigation";
import {
  CATALOG_LIST_DEFAULTS,
  catalogListToQuery,
  type CatalogListParams,
  type CatalogRow,
  type CatalogSort,
} from "@/lib/catalog-query";

/**
 * The catalog list. Like the orders and customers tables it only renders:
 * search, filter, sort and paging are URL state resolved on the server.
 *
 * No quick look here — a model has an edit screen and nothing else, so the
 * name goes straight there rather than opening a panel that would only repeat
 * the row you are already looking at.
 */

/** Which direction a column should take when you first sort by it. */
const FIRST_DIR: Record<CatalogSort, "asc" | "desc"> = {
  name: "asc",
  sku: "asc",
  price: "desc",
  orderLines: "desc",
};

export function CatalogTable({
  rows,
  total,
  pageCount,
  params,
}: {
  rows: CatalogRow[];
  total: number;
  pageCount: number;
  params: CatalogListParams;
}) {
  const t = useTranslations("catalog");
  const tc = useTranslations("common");
  const locale = useLocale();

  const { setParams, isPending, startTransition, search, setSearch } =
    useListParams(params, catalogListToQuery);

  const sortBy = useCallback(
    (key: CatalogSort) => {
      setParams(
        params.sort === key
          ? { dir: params.dir === "asc" ? "desc" : "asc" }
          : { sort: key, dir: FIRST_DIR[key] },
      );
    },
    [params.sort, params.dir, setParams],
  );

  const columns = useMemo<ColumnDef<CatalogRow>[]>(
    () => [
      {
        accessorKey: "name",
        enableHiding: false,
        meta: { sortKey: "name" },
        header: () => (
          <SortHeader
            label={t("name")}
            sortKey="name"
            active={params.sort === "name"}
            dir={params.dir}
            onSort={sortBy}
          />
        ),
        cell: ({ row }) => (
          <Link
            href={`/catalog/${row.original.id}/edit`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "sku",
        // Dropped first on narrow screens: a SKU is what you search by, not
        // what you scan by — the name already tells you which model this is.
        meta: { cellClassName: "hidden sm:table-cell", sortKey: "sku" },
        header: () => (
          <SortHeader
            label={t("sku")}
            sortKey="sku"
            active={params.sort === "sku"}
            dir={params.dir}
            onSort={sortBy}
          />
        ),
        cell: ({ row }) => (
          // A SKU is a code: read left to right even in Hebrew.
          <span dir="ltr" className="text-start text-muted-foreground">
            {row.original.sku ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "defaultPriceAgorot",
        meta: { sortKey: "price" },
        header: () => (
          <SortHeader
            label={t("price")}
            sortKey="price"
            align="end"
            active={params.sort === "price"}
            dir={params.dir}
            onSort={sortBy}
          />
        ),
        cell: ({ row }) => (
          <div className="text-end tabular-nums">
            {row.original.defaultPriceAgorot != null ? (
              formatMoney(row.original.defaultPriceAgorot, locale)
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "orderLines",
        meta: { cellClassName: "hidden md:table-cell", sortKey: "orderLines" },
        header: () => (
          <SortHeader
            label={t("orderLines")}
            sortKey="orderLines"
            align="end"
            active={params.sort === "orderLines"}
            dir={params.dir}
            onSort={sortBy}
          />
        ),
        cell: ({ row }) => (
          <div className="text-end tabular-nums text-muted-foreground">
            {row.original.orderLines}
          </div>
        ),
      },
      {
        accessorKey: "isActive",
        header: t("active"),
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "success" : "secondary"}>
            {row.original.isActive ? t("active") : t("inactive")}
          </Badge>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        header: () => <span className="sr-only">{tc("actions")}</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <ModelRowActions id={row.original.id} name={row.original.name} />
          </div>
        ),
      },
    ],
    [locale, t, tc, params.sort, params.dir, sortBy],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      total={total}
      pageCount={pageCount}
      params={params}
      defaultFilter={CATALOG_LIST_DEFAULTS.filter}
      setParams={setParams}
      startTransition={startTransition}
      isPending={isPending}
      search={search}
      setSearch={setSearch}
      filterTabs={[
        { value: "all", label: t("filterAll") },
        { value: "active", label: t("filterActive") },
        { value: "inactive", label: t("filterInactive") },
      ]}
      columnLabels={{
        sku: t("sku"),
        defaultPriceAgorot: t("price"),
        orderLines: t("orderLines"),
        isActive: t("active"),
      }}
      strings={{
        searchPlaceholder: t("searchPlaceholder"),
        rowCount: t("rowCount", { count: total }),
        noResults: t("noResults"),
        noMatch: t("noMatch"),
      }}
    />
  );
}
