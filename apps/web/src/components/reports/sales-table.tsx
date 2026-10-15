"use client";

import { formatMoney } from "@repo/domain";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { SortHeader } from "@/components/data-table/sort-header";
import { useListParams } from "@/components/data-table/use-list-params";
import {
  SALES_LIST_DEFAULTS,
  salesListToQuery,
  type SalesListParams,
  type SalesRow,
  type SalesSort,
} from "@/lib/sales-query";

/**
 * The sales report. Month and week are the list's filter tabs rather than a
 * separate pair of buttons — it is the same "which slice am I looking at"
 * choice every other list spends its tabs on.
 *
 * No search box: a period is a date, and typing at one is not how anybody
 * looks for it — so `strings` omits the placeholder and the shell leaves the
 * box out. The column labels carry the meaning instead.
 */

/** Which direction a column should take when you first sort by it. */
const FIRST_DIR: Record<SalesSort, "asc" | "desc"> = {
  period: "desc",
  orders: "desc",
  gross: "desc",
  collected: "desc",
  outstanding: "desc",
};

export function SalesTable({
  rows,
  total,
  pageCount,
  params,
}: {
  rows: SalesRow[];
  total: number;
  pageCount: number;
  params: SalesListParams;
}) {
  const t = useTranslations("reports");
  const locale = useLocale();
  const intlLocale = locale === "he" ? "he-IL" : "en-US";

  const { setParams, isPending, startTransition, search, setSearch } =
    useListParams(params, salesListToQuery);

  const monthFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(intlLocale, { year: "numeric", month: "long" }),
    [intlLocale],
  );
  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium" }),
    [intlLocale],
  );

  const sortBy = useCallback(
    (key: SalesSort) => {
      setParams(
        params.sort === key
          ? { dir: params.dir === "asc" ? "desc" : "asc" }
          : { sort: key, dir: FIRST_DIR[key] },
      );
    },
    [params.sort, params.dir, setParams],
  );

  const columns = useMemo<DataTableColumn<SalesRow>[]>(
    () => [
      {
        accessorKey: "start",
        enableHiding: false,
        meta: { sortKey: "period" },
        header: () => (
          <SortHeader
            label={t("colPeriod")}
            sortKey="period"
            active={params.sort === "period"}
            dir={params.dir}
            onSort={sortBy}
          />
        ),
        cell: ({ row }) => {
          const d = new Date(row.original.start);
          return (
            <span className="font-medium">
              {params.filter === "month"
                ? monthFmt.format(d)
                : t("weekOf", { date: dateFmt.format(d) })}
            </span>
          );
        },
      },
      {
        accessorKey: "orders",
        meta: { cellClassName: "hidden sm:table-cell", sortKey: "orders" },
        header: () => (
          <SortHeader
            label={t("colOrders")}
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
        accessorKey: "grossAgorot",
        enableHiding: false,
        meta: { sortKey: "gross" },
        header: () => (
          <SortHeader
            label={t("colGross")}
            sortKey="gross"
            align="end"
            active={params.sort === "gross"}
            dir={params.dir}
            onSort={sortBy}
          />
        ),
        cell: ({ row }) => (
          <div className="text-end font-medium tabular-nums">
            {formatMoney(row.original.grossAgorot, locale)}
          </div>
        ),
      },
      {
        accessorKey: "collectedAgorot",
        meta: { cellClassName: "hidden md:table-cell", sortKey: "collected" },
        header: () => (
          <SortHeader
            label={t("colCollected")}
            sortKey="collected"
            align="end"
            active={params.sort === "collected"}
            dir={params.dir}
            onSort={sortBy}
          />
        ),
        cell: ({ row }) => (
          <div className="text-end tabular-nums">
            {formatMoney(row.original.collectedAgorot, locale)}
          </div>
        ),
      },
      {
        accessorKey: "outstandingAgorot",
        meta: { cellClassName: "hidden md:table-cell", sortKey: "outstanding" },
        header: () => (
          <SortHeader
            label={t("colOutstanding")}
            sortKey="outstanding"
            align="end"
            active={params.sort === "outstanding"}
            dir={params.dir}
            onSort={sortBy}
          />
        ),
        cell: ({ row }) => (
          <div className="text-end tabular-nums">
            {formatMoney(row.original.outstandingAgorot, locale)}
          </div>
        ),
      },
    ],
    [locale, t, params.sort, params.dir, params.filter, sortBy, monthFmt, dateFmt],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.start}
      pageCount={pageCount}
      params={params}
      defaultFilter={SALES_LIST_DEFAULTS.filter}
      setParams={setParams}
      startTransition={startTransition}
      isPending={isPending}
      search={search}
      setSearch={setSearch}
      filterTabs={[
        { value: "month", label: t("monthly") },
        { value: "week", label: t("weekly") },
      ]}
      columnLabels={{
        orders: t("colOrders"),
        collectedAgorot: t("colCollected"),
        outstandingAgorot: t("colOutstanding"),
      }}
      strings={{
        rowCount: t("salesRowCount", { count: total }),
        noResults: t("salesEmpty"),
        noMatch: t("salesEmpty"),
      }}
    />
  );
}
