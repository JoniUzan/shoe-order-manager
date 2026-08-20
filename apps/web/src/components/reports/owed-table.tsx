"use client";

import { formatMoney } from "@repo/domain";
import type { ColumnDef } from "@tanstack/react-table";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { DataTable } from "@/components/data-table/data-table";
import { SortHeader } from "@/components/data-table/sort-header";
import { useListParams } from "@/components/data-table/use-list-params";
import { Link } from "@/i18n/navigation";
import {
  OWED_LIST_DEFAULTS,
  owedListToQuery,
  type OwedListParams,
  type OwedRow,
  type OwedSort,
} from "@/lib/owed-query";

/**
 * The owed report. Like every other list in the app it only renders: search,
 * sort and paging are URL state resolved on the server.
 *
 * No filter tabs — the report is already the filter. Its subject is open
 * orders carrying a balance, and there is no second view of that worth a tab.
 */

/** Which direction a column should take when you first sort by it. */
const FIRST_DIR: Record<OwedSort, "asc" | "desc"> = {
  name: "asc",
  orders: "desc",
  owed: "desc",
};

export function OwedTable({
  rows,
  total,
  pageCount,
  params,
  grandTotalAgorot,
}: {
  rows: OwedRow[];
  total: number;
  pageCount: number;
  params: OwedListParams;
  grandTotalAgorot: number;
}) {
  const t = useTranslations("reports");
  const locale = useLocale();

  const { setParams, isPending, startTransition, search, setSearch } =
    useListParams(params, owedListToQuery);

  const sortBy = useCallback(
    (key: OwedSort) => {
      setParams(
        params.sort === key
          ? { dir: params.dir === "asc" ? "desc" : "asc" }
          : { sort: key, dir: FIRST_DIR[key] },
      );
    },
    [params.sort, params.dir, setParams],
  );

  const columns = useMemo<ColumnDef<OwedRow>[]>(
    () => [
      {
        accessorKey: "name",
        enableHiding: false,
        meta: { sortKey: "name" },
        header: () => (
          <SortHeader
            label={t("colCustomer")}
            sortKey="name"
            active={params.sort === "name"}
            dir={params.dir}
            onSort={sortBy}
          />
        ),
        cell: ({ row }) => (
          <Link
            href={`/customers/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "orders",
        meta: { cellClassName: "hidden sm:table-cell", sortKey: "orders" },
        header: () => (
          <SortHeader
            label={t("colOpenOrders")}
            sortKey="orders"
            align="end"
            active={params.sort === "orders"}
            dir={params.dir}
            onSort={sortBy}
          />
        ),
        cell: ({ row }) => (
          <div className="text-end tabular-nums text-muted-foreground">
            {row.original.orders}
          </div>
        ),
      },
      {
        accessorKey: "owedAgorot",
        enableHiding: false,
        meta: { sortKey: "owed" },
        header: () => (
          <SortHeader
            label={t("colOwed")}
            sortKey="owed"
            align="end"
            active={params.sort === "owed"}
            dir={params.dir}
            onSort={sortBy}
          />
        ),
        cell: ({ row }) => (
          <div className="text-end font-medium tabular-nums">
            {formatMoney(row.original.owedAgorot, locale)}
          </div>
        ),
      },
    ],
    [locale, t, params.sort, params.dir, sortBy],
  );

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        total={total}
        pageCount={pageCount}
        params={params}
        defaultFilter={OWED_LIST_DEFAULTS.filter}
        setParams={setParams}
        startTransition={startTransition}
        isPending={isPending}
        search={search}
        setSearch={setSearch}
        columnLabels={{ orders: t("colOpenOrders") }}
        strings={{
          searchPlaceholder: t("owedSearchPlaceholder"),
          rowCount: t("owedRowCount", { count: total }),
          noResults: t("owedEmpty"),
          noMatch: t("owedNoMatch"),
        }}
      />

      {/* The bottom line sits outside the table on purpose: it is the total
          across every customer, not a sum of the page, so putting it in a
          `tfoot` under ten of them would read as though it added them up. */}
      {total > 0 && (
        // `px-3` is the table's cell padding: the bottom line has to start on
        // the same vertical as the customer names it is summing.
        <div className="flex items-baseline justify-between rounded-card border bg-muted/40 px-3 py-3">
          <span className="text-sm font-medium">{t("owedTotal")}</span>
          <span className="text-base font-bold tabular-nums">
            {formatMoney(grandTotalAgorot, locale)}
          </span>
        </div>
      )}
    </div>
  );
}
