"use client";

import { formatMoney, formatSize } from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
import type { ColumnDef } from "@tanstack/react-table";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";

import { DataTable } from "@/components/data-table/data-table";
import { SortHeader } from "@/components/data-table/sort-header";
import { useListParams } from "@/components/data-table/use-list-params";
import { ModelThumb } from "@/components/orders/model-thumb";
import { itemDetails } from "@/lib/item-details";
import {
  ORDER_ITEM_LIST_DEFAULTS,
  orderItemListToQuery,
  type OrderItemListParams,
  type OrderItemRow,
  type OrderItemSort,
} from "@/lib/order-items-query";

/**
 * One order's line items, on the same table as every other list.
 *
 * Most orders fit on a page, and the shell hides the pager — and the toolbar —
 * when they do. So on a small order this reads as the plain table it was, and
 * only earns its controls on the large ones that used to be an unbroken wall
 * of rows.
 */

/** Which direction a column should take when you first sort by it. */
const FIRST_DIR: Record<OrderItemSort, "asc" | "desc"> = {
  name: "asc",
  size: "asc",
  quantity: "desc",
  unitPrice: "desc",
  lineTotal: "desc",
};

export function OrderItemsTable({
  rows,
  total,
  totalUnfiltered,
  pageCount,
  params,
}: {
  rows: OrderItemRow[];
  total: number;
  /** The order's line count before any filter — see `showToolbar` below. */
  totalUnfiltered: number;
  pageCount: number;
  params: OrderItemListParams;
}) {
  const t = useTranslations("orders");
  const locale = useLocale();

  const { setParams, isPending, startTransition, search, setSearch } =
    useListParams(params, orderItemListToQuery);

  const sortBy = useCallback(
    (key: OrderItemSort) => {
      setParams(
        params.sort === key
          ? { dir: params.dir === "asc" ? "desc" : "asc" }
          : { sort: key, dir: FIRST_DIR[key] },
      );
    },
    [params.sort, params.dir, setParams],
  );

  const columns = useMemo<ColumnDef<OrderItemRow>[]>(
    () => [
      {
        accessorKey: "name",
        enableHiding: false,
        meta: { sortKey: "name" },
        header: () => (
          <SortHeader
            label={t("items")}
            sortKey="name"
            active={params.sort === "name"}
            dir={params.dir}
            onSort={sortBy}
          />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.imageUrl && (
              <ModelThumb
                src={row.original.imageUrl}
                className="size-9 rounded-lg md:size-9"
              />
            )}
            <div className="flex min-w-0 flex-col">
              <div className="flex items-center gap-2">
                <span className="font-medium">{row.original.name}</span>
                {/* A free-text line has no catalog model behind it, which is
                    worth seeing: it will not appear in any catalog report. */}
                {row.original.shoeModelId === null && (
                  <Badge variant="secondary">{t("customItem")}</Badge>
                )}
              </div>
              {/* Under the name rather than in a column of their own, so they
                  still show on a phone. */}
              {itemDetails(row.original) && (
                <span className="text-xs text-muted-foreground">
                  {itemDetails(row.original)}
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "size",
        meta: { sortKey: "size" },
        header: () => (
          <SortHeader
            label={t("size")}
            sortKey="size"
            active={params.sort === "size"}
            dir={params.dir}
            onSort={sortBy}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatSize(row.original.size, row.original.sizeFormat ?? undefined)}
          </span>
        ),
      },
      {
        accessorKey: "quantity",
        meta: { sortKey: "quantity" },
        header: () => (
          <SortHeader
            label={t("quantity")}
            sortKey="quantity"
            align="end"
            active={params.sort === "quantity"}
            dir={params.dir}
            onSort={sortBy}
          />
        ),
        cell: ({ row }) => (
          <div className="text-end tabular-nums">{row.original.quantity}</div>
        ),
      },
      {
        accessorKey: "unitPriceAgorot",
        meta: { cellClassName: "hidden md:table-cell", sortKey: "unitPrice" },
        header: () => (
          <SortHeader
            label={t("unitPrice")}
            sortKey="unitPrice"
            align="end"
            active={params.sort === "unitPrice"}
            dir={params.dir}
            onSort={sortBy}
          />
        ),
        cell: ({ row }) => (
          <div className="text-end tabular-nums">
            {formatMoney(row.original.unitPriceAgorot, locale)}
          </div>
        ),
      },
      {
        accessorKey: "lineTotalAgorot",
        enableHiding: false,
        meta: { sortKey: "lineTotal" },
        header: () => (
          <SortHeader
            label={t("lineTotal")}
            sortKey="lineTotal"
            align="end"
            active={params.sort === "lineTotal"}
            dir={params.dir}
            onSort={sortBy}
          />
        ),
        cell: ({ row }) => (
          <div className="text-end font-medium tabular-nums">
            {formatMoney(row.original.lineTotalAgorot, locale)}
          </div>
        ),
      },
    ],
    [locale, t, params.sort, params.dir, sortBy],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      total={total}
      pageCount={pageCount}
      params={params}
      defaultFilter={ORDER_ITEM_LIST_DEFAULTS.filter}
      setParams={setParams}
      startTransition={startTransition}
      isPending={isPending}
      search={search}
      setSearch={setSearch}
      // Searching and filtering eight lines you can already see is work for
      // nothing. The threshold is a page, so the controls arrive exactly when
      // the pager does.
      showToolbar={totalUnfiltered > params.per}
      filterTabs={[
        { value: "all", label: t("itemsFilterAll") },
        { value: "catalog", label: t("itemsFilterCatalog") },
        { value: "custom", label: t("itemsFilterCustom") },
      ]}
      columnLabels={{
        unitPriceAgorot: t("unitPrice"),
      }}
      strings={{
        searchPlaceholder: t("itemsSearchPlaceholder"),
        rowCount: t("itemsRowCount", { count: total }),
        noResults: t("itemsEmpty"),
        noMatch: t("itemsNoMatch"),
      }}
    />
  );
}
