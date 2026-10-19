import { Skeleton } from "@repo/ui/components/skeleton";
import { useTranslations } from "next-intl";

import { CATALOG_LIST_DEFAULTS } from "@/lib/catalog-query";
import { CUSTOMER_LIST_DEFAULTS } from "@/lib/customers-query";
import { ORDER_ITEM_LIST_DEFAULTS } from "@/lib/order-items-query";
import {
  DASHBOARD_ORDER_DEFAULTS,
  ORDER_LIST_DEFAULTS,
} from "@/lib/orders-query";
import { OWED_LIST_DEFAULTS } from "@/lib/owed-query";
import { SALES_LIST_DEFAULTS } from "@/lib/sales-query";

import { TableSkeleton, type SkeletonListState } from "./table-skeleton";

/**
 * Each list's TableSkeleton. The columns mirror the real table's column
 * definitions one for one — heading, `sortKey`, alignment and
 * `meta.cellClassName` — so keep them in step when a table changes. One per
 * table, shared by the route's `loading.tsx` (no params yet: the list's
 * defaults) and the page's own Suspense fallback (the URL's params).
 */

type ListState = SkeletonListState & { per: number };

/** Rows to draw: the list's page size, but never more than a screenful. */
export function skeletonRows(per: number | undefined) {
  return Math.min(per ?? 10, 10);
}

/** The orders table: /orders, the dashboard, a Customer's history and report. */
export function OrdersTableSkeleton({
  params,
  scopedToCustomer = false,
  onDashboard = false,
}: {
  params?: ListState;
  /** As OrdersTable's: no customer column, the scoped search placeholder. */
  scopedToCustomer?: boolean;
  /** As OrdersTable's: the list opens on the Open orders. */
  onDashboard?: boolean;
}) {
  const t = useTranslations("dashboard");
  const tOrders = useTranslations("orders");
  const state =
    params ?? (onDashboard ? DASHBOARD_ORDER_DEFAULTS : ORDER_LIST_DEFAULTS);
  return (
    <TableSkeleton
      rows={skeletonRows(state.per)}
      state={state}
      toolbar={{
        tabs: [
          { value: "all", label: tOrders("filterAll") },
          { value: "open", label: tOrders("filterOpen") },
          { value: "unpaid", label: tOrders("filterUnpaid") },
          { value: "recent", label: tOrders("filterRecent") },
        ],
        searchPlaceholder: t(
          scopedToCustomer ? "searchPlaceholderScoped" : "searchPlaceholder",
        ),
        columns: true,
      }}
      columns={[
        { cell: "check" },
        { label: t("colOrder"), sortKey: "orderNumber", width: 28 },
        ...(scopedToCustomer
          ? []
          : [{ label: t("colCustomer"), sortKey: "customerName", width: 96 }]),
        {
          label: tOrders("date"),
          sortKey: "createdAt",
          cellClassName: "hidden md:table-cell",
          width: 80,
        },
        { label: t("colStatus"), cell: "badges" as const, badges: [80, 72] },
        {
          label: t("colItems"),
          cellClassName: "hidden lg:table-cell",
          width: 12,
        },
        { label: t("colTotal"), sortKey: "totalAgorot", end: true, width: 64 },
        { label: t("colBalance"), end: true, width: 56 },
        { cell: "action" },
      ]}
    />
  );
}

export function CustomersTableSkeleton({ params }: { params?: ListState }) {
  const t = useTranslations("customers");
  const state = params ?? CUSTOMER_LIST_DEFAULTS;
  return (
    <TableSkeleton
      rows={skeletonRows(state.per)}
      state={state}
      toolbar={{
        tabs: [
          { value: "all", label: t("filterAll") },
          { value: "owing", label: t("filterOwing") },
          { value: "hasOrders", label: t("filterHasOrders") },
        ],
        searchPlaceholder: t("searchPlaceholder"),
        columns: true,
      }}
      columns={[
        { label: t("name"), sortKey: "name", width: 96 },
        {
          label: t("contactName"),
          cellClassName: "hidden md:table-cell",
          width: 72,
        },
        { label: t("phone"), cellClassName: "hidden sm:table-cell", width: 88 },
        { label: t("ordersCount"), sortKey: "ordersCount", end: true, width: 12 },
        { label: t("outstanding"), end: true, width: 64 },
        { cell: "action" },
      ]}
    />
  );
}

export function CatalogTableSkeleton({ params }: { params?: ListState }) {
  const t = useTranslations("catalog");
  const state = params ?? CATALOG_LIST_DEFAULTS;
  return (
    <TableSkeleton
      rows={skeletonRows(state.per)}
      state={state}
      toolbar={{
        tabs: [
          { value: "all", label: t("filterAll") },
          { value: "active", label: t("filterActive") },
          { value: "inactive", label: t("filterInactive") },
        ],
        searchPlaceholder: t("searchPlaceholder"),
        columns: true,
      }}
      columns={[
        {
          label: t("name"),
          sortKey: "name",
          cell: "thumb",
          thumb: "size-10 rounded-[0.625rem]",
          width: 56,
        },
        {
          label: t("sku"),
          sortKey: "sku",
          cellClassName: "hidden sm:table-cell",
          width: 56,
        },
        { label: t("price"), sortKey: "price", end: true, width: 56 },
        {
          label: t("orderLines"),
          sortKey: "orderLines",
          end: true,
          cellClassName: "hidden md:table-cell",
          width: 12,
        },
        { label: t("active"), cell: "badges", badges: [40] },
        { cell: "action" },
      ]}
    />
  );
}

/**
 * An order's line items, on its page. No toolbar: the real one shows it only
 * when the lines run past a page, and most orders fit on one. Four rows, the
 * size of a usual order, rather than the page size of 20.
 */
export function OrderItemsTableSkeleton({
  params,
  rows = 4,
}: {
  params?: ListState;
  /** The order's item count when the page knows it, up to a page. */
  rows?: number;
}) {
  const t = useTranslations("orders");
  const state = params ?? ORDER_ITEM_LIST_DEFAULTS;
  return (
    <TableSkeleton
      rows={Math.min(rows, state.per)}
      state={state}
      columns={[
        { label: t("items"), sortKey: "name", width: 96 },
        { label: t("size"), sortKey: "size", width: 20 },
        { label: t("quantity"), sortKey: "quantity", end: true, width: 16 },
        {
          label: t("unitPrice"),
          sortKey: "unitPrice",
          end: true,
          cellClassName: "hidden md:table-cell",
          width: 56,
        },
        { label: t("lineTotal"), sortKey: "lineTotal", end: true, width: 64 },
      ]}
    />
  );
}

/** The sales report's table: Monthly/Weekly tabs, no search box. */
export function SalesTableSkeleton({ params }: { params?: ListState }) {
  const t = useTranslations("reports");
  const state = params ?? SALES_LIST_DEFAULTS;
  return (
    <TableSkeleton
      rows={skeletonRows(state.per)}
      state={state}
      toolbar={{
        tabs: [
          { value: "month", label: t("monthly") },
          { value: "week", label: t("weekly") },
        ],
        columns: true,
      }}
      columns={[
        { label: t("colPeriod"), sortKey: "period", width: 88 },
        {
          label: t("colOrders"),
          sortKey: "orders",
          end: true,
          cellClassName: "hidden sm:table-cell",
          width: 12,
        },
        { label: t("colGross"), sortKey: "gross", end: true, width: 64 },
        {
          label: t("colCollected"),
          sortKey: "collected",
          end: true,
          cellClassName: "hidden md:table-cell",
          width: 64,
        },
        {
          label: t("colOutstanding"),
          sortKey: "outstanding",
          end: true,
          cellClassName: "hidden md:table-cell",
          width: 64,
        },
      ]}
    />
  );
}

/** The owed report's table, with the total open debt under it. */
export function OwedTableSkeleton({ params }: { params?: ListState }) {
  const t = useTranslations("reports");
  const state = params ?? OWED_LIST_DEFAULTS;
  return (
    <TableSkeleton
      rows={skeletonRows(state.per)}
      state={state}
      toolbar={{
        searchPlaceholder: t("owedSearchPlaceholder"),
        columns: true,
      }}
      columns={[
        { label: t("colCustomer"), sortKey: "name", width: 96 },
        {
          label: t("colOpenOrders"),
          sortKey: "orders",
          end: true,
          cellClassName: "hidden sm:table-cell",
          width: 12,
        },
        { label: t("colOwed"), sortKey: "owed", end: true, width: 64 },
      ]}
      after={
        // OwedTable's bottom line, with the figure greyed.
        <div className="flex items-baseline justify-between rounded-card border bg-muted/40 px-3 py-3">
          <span className="text-sm font-medium">{t("owedTotal")}</span>
          <div className="flex h-6 items-center self-center">
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      }
    />
  );
}
