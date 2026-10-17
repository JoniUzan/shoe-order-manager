import { useTranslations } from "next-intl";

import { TableSkeleton } from "./table-skeleton";

/**
 * Each list's TableSkeleton, with its real headings and the columns a phone
 * hides hidden here too. One per table, shared by the route's `loading.tsx`
 * and the page's own Suspense fallback.
 */

/** Rows to draw: the list's page size, but never more than a screenful. */
export function skeletonRows(per: number | undefined) {
  return Math.min(per ?? 10, 10);
}

export function OrdersTableSkeleton({
  rows,
  scopedToCustomer = false,
}: {
  rows?: number;
  scopedToCustomer?: boolean;
}) {
  const t = useTranslations("dashboard");
  const tOrders = useTranslations("orders");
  return (
    <TableSkeleton
      rows={rows}
      toolbar={{ tabs: 4, search: true }}
      columns={[
        { cell: "check" },
        { label: t("colOrder"), width: 44 },
        ...(scopedToCustomer ? [] : [{ label: t("colCustomer"), width: 150 }]),
        { label: tOrders("date"), width: 76, className: "hidden md:table-cell" },
        { label: t("colStatus"), cell: "pill" as const, width: 72 },
        { label: t("colItems"), width: 28 },
        { label: t("colTotal"), width: 72, end: true },
        { label: t("colBalance"), width: 64, end: true },
        { cell: "action" },
      ]}
    />
  );
}

export function CustomersTableSkeleton({ rows }: { rows?: number }) {
  const t = useTranslations("customers");
  return (
    <TableSkeleton
      rows={rows}
      toolbar={{ tabs: 3, search: true }}
      columns={[
        { label: t("name"), width: 150 },
        { label: t("contactName"), width: 110, className: "hidden md:table-cell" },
        { label: t("phone"), width: 96, className: "hidden sm:table-cell" },
        { label: t("ordersCount"), width: 28 },
        { label: t("outstanding"), width: 72, end: true },
        { cell: "action" },
      ]}
    />
  );
}

export function CatalogTableSkeleton({ rows }: { rows?: number }) {
  const t = useTranslations("catalog");
  return (
    <TableSkeleton
      rows={rows}
      toolbar={{ tabs: 3, search: true }}
      columns={[
        { label: t("name"), cell: "thumb", width: 130 },
        { label: t("sku"), width: 64, className: "hidden sm:table-cell" },
        { label: t("price"), width: 64, end: true },
        { label: t("orderLines"), width: 28, className: "hidden md:table-cell" },
        { label: t("active"), cell: "pill", width: 40 },
        { cell: "action" },
      ]}
    />
  );
}

/** An order's line items, on its page. */
export function OrderItemsTableSkeleton({ rows = 6 }: { rows?: number }) {
  const t = useTranslations("orders");
  return (
    <TableSkeleton
      rows={rows}
      toolbar={{ tabs: 3, search: true }}
      columns={[
        { label: t("items"), cell: "thumb", width: 130 },
        { label: t("size"), width: 40 },
        { label: t("quantity"), width: 28 },
        { label: t("unitPrice"), width: 56, end: true, className: "hidden md:table-cell" },
        { label: t("lineTotal"), width: 64, end: true },
      ]}
    />
  );
}

export function SalesTableSkeleton() {
  const t = useTranslations("reports");
  return (
    <TableSkeleton
      rows={8}
      toolbar={false}
      columns={[
        { label: t("colPeriod"), width: 96 },
        { label: t("colOrders"), width: 28, className: "hidden sm:table-cell" },
        { label: t("colGross"), width: 72, end: true },
        { label: t("colCollected"), width: 64, end: true, className: "hidden md:table-cell" },
        { label: t("colOutstanding"), width: 60, end: true, className: "hidden md:table-cell" },
      ]}
    />
  );
}

export function OwedTableSkeleton({ rows }: { rows?: number }) {
  const t = useTranslations("reports");
  return (
    <TableSkeleton
      rows={rows}
      toolbar={{ tabs: 0, search: true }}
      columns={[
        { label: t("colCustomer"), width: 150 },
        { label: t("colOpenOrders"), width: 28, className: "hidden sm:table-cell" },
        { label: t("colOwed"), width: 72, end: true },
      ]}
    />
  );
}
