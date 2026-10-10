"use client";

import { formatMoney } from "@repo/domain";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import { cn } from "@repo/ui/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, RotateCcw, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { SortHeader } from "@/components/data-table/sort-header";
import { useListParams } from "@/components/data-table/use-list-params";
import { OrderStatusBadge, PaymentBadge } from "@/components/orders/badges";
import { OrderRowActions } from "@/components/orders/order-row-actions";
import { Link, useRouter } from "@/i18n/navigation";
import { deleteOrders, setOrdersStatus } from "@/lib/actions/orders";
import {
  dashboardOrderListToQuery,
  DASHBOARD_ORDER_DEFAULTS,
  ORDER_LIST_DEFAULTS,
  orderListToQuery,
  type OrderListParams,
  type OrderRow,
  type OrderSort,
} from "@/lib/orders-query";

/**
 * The orders table, shared by the dashboard and /orders.
 *
 * Everything list-shaped (toolbar, paging, column visibility) lives in
 * `<DataTable>`; what's here is what's specific to orders — the columns and bulk
 * selection. A row opens its Order page.
 */

/** Which direction a column should take when you first sort by it. */
const FIRST_DIR: Record<OrderSort, "asc" | "desc"> = {
  orderNumber: "desc",
  createdAt: "desc",
  customerName: "asc",
  totalAgorot: "desc",
};

export function OrdersTable({
  rows,
  total,
  pageCount,
  params,
  scopedToCustomer = false,
  onDashboard = false,
}: {
  rows: OrderRow[];
  total: number;
  pageCount: number;
  params: OrderListParams;
  /**
   * The list is already narrowed to one customer, so the customer column would
   * repeat the same name on every row and sorting by it would do nothing. Drops
   * the column rather than hiding it, so it cannot be switched back on from the
   * column menu into a state the rows do not support. Narrows the search
   * placeholder to match.
   */
  scopedToCustomer?: boolean;
  /** On the dashboard the list opens on Open orders (see orders-query). */
  onDashboard?: boolean;
}) {
  const t = useTranslations("dashboard");
  const tOrders = useTranslations("orders");
  const tc = useTranslations("common");
  const locale = useLocale();

  const router = useRouter();
  const { setParams, isPending, startTransition, search, setSearch, viewKey } =
    useListParams(
      params,
      onDashboard ? dashboardOrderListToQuery : orderListToQuery,
    );

  /* --------------------------------------------------------------- selection */

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmingBulk, setConfirmingBulk] = useState(false);
  const [bulkPending, startBulk] = useTransition();

  // Selection is per-view: it clears whenever the visible set changes. Acting
  // in bulk on rows you can no longer see is the one mistake worth designing
  // out. Reset during render rather than in an effect, so the new page never
  // renders for a frame still carrying the old page's ticks.
  const [lastView, setLastView] = useState(viewKey);
  if (viewKey !== lastView) {
    setLastView(viewKey);
    setSelected(new Set());
  }

  const toggleRow = useCallback((id: string, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someOnPage = rows.some((r) => selected.has(r.id));

  const toggleAll = useCallback(
    (on: boolean) => {
      setSelected(on ? new Set(rows.map((r) => r.id)) : new Set());
    },
    [rows],
  );

  function bulkStatus(statusCode: "done" | "not_done") {
    const ids = [...selected];
    startBulk(async () => {
      const res = await setOrdersStatus(ids, statusCode);
      if (res.ok) {
        toast.success(t("bulkUpdated", { count: res.count }));
        setSelected(new Set());
        router.refresh();
      } else {
        toast.error(tOrders("errorGeneric"));
      }
    });
  }

  function bulkDelete() {
    const ids = [...selected];
    startBulk(async () => {
      const res = await deleteOrders(ids);
      if (res.ok) {
        toast.success(t("bulkDeleted", { count: res.count }));
        setSelected(new Set());
        setConfirmingBulk(false);
        router.refresh();
      } else {
        toast.error(tOrders("errorGeneric"));
      }
    });
  }

  /* ----------------------------------------------------------------- columns */

  const sortBy = useCallback(
    (key: OrderSort) => {
      setParams(
        params.sort === key
          ? { dir: params.dir === "asc" ? "desc" : "asc" }
          : { sort: key, dir: FIRST_DIR[key] },
      );
    },
    [params.sort, params.dir, setParams],
  );

  const columns = useMemo<ColumnDef<OrderRow>[]>(
    () => [
      {
        id: "select",
        enableHiding: false,
        header: () => (
          <Checkbox
            checked={allOnPage ? true : someOnPage ? "indeterminate" : false}
            onCheckedChange={(v) => toggleAll(!!v)}
            aria-label={t("selectAll")}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selected.has(row.original.id)}
            onCheckedChange={(v) => toggleRow(row.original.id, !!v)}
            aria-label={t("selectRow", { number: row.original.orderNumber })}
            // A 16px box is a desk target. The pseudo-element grows the
            // pressable area to ~40x48 for a thumb in a shop without moving
            // a pixel of the drawn control.
            className="relative before:absolute before:-inset-x-4 before:-inset-y-3 before:content-['']"
          />
        ),
      },
      {
        accessorKey: "orderNumber",
        meta: { sortKey: "orderNumber" },
        header: () => (
          <SortHeader
            label={t("colOrder")}
            sortKey="orderNumber"
            active={params.sort === "orderNumber"}
            dir={params.dir}
            onSort={sortBy}
          />
        ),
        cell: ({ row }) => (
          <Link
            href={`/orders/${row.original.id}`}
            className="font-medium tabular-nums underline-offset-4 hover:underline"
          >
            <bdi>#{row.original.orderNumber}</bdi>
          </Link>
        ),
      },
      ...(scopedToCustomer
        ? []
        : [
            {
              accessorKey: "customerName",
              meta: { sortKey: "customerName" },
              header: () => (
                <SortHeader
                  label={t("colCustomer")}
                  sortKey="customerName"
                  active={params.sort === "customerName"}
                  dir={params.dir}
                  onSort={sortBy}
                />
              ),
              cell: ({ row }) => (
                <Link
                  href={`/customers/${row.original.customerId}`}
                  className="underline-offset-4 hover:underline"
                >
                  {row.original.customerName}
                </Link>
              ),
            } satisfies ColumnDef<OrderRow>,
          ]),
      {
        accessorKey: "createdAt",
        // Dropped first on narrow screens: the phone scenes are "who owes me"
        // and "did this get paid", and the order number already implies recency.
        meta: { cellClassName: "hidden md:table-cell", sortKey: "createdAt" },
        header: () => (
          <SortHeader
            label={tOrders("date")}
            sortKey="createdAt"
            active={params.sort === "createdAt"}
            dir={params.dir}
            onSort={sortBy}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleDateString(locale, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        ),
      },
      {
        id: "status",
        header: t("colStatus"),
        cell: ({ row }) => (
          <div className="flex gap-1.5">
            <OrderStatusBadge code={row.original.statusCode} />
            <PaymentBadge status={row.original.paymentStatus} />
          </div>
        ),
      },
      {
        accessorKey: "itemCount",
        meta: { cellClassName: "hidden lg:table-cell" },
        header: t("colItems"),
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {row.original.itemCount}
          </span>
        ),
      },
      {
        accessorKey: "totalAgorot",
        meta: { sortKey: "totalAgorot" },
        header: () => (
          <SortHeader
            label={t("colTotal")}
            sortKey="totalAgorot"
            align="end"
            active={params.sort === "totalAgorot"}
            dir={params.dir}
            onSort={sortBy}
          />
        ),
        cell: ({ row }) => (
          <div className="text-end font-medium tabular-nums">
            {formatMoney(row.original.totalAgorot, locale)}
          </div>
        ),
      },
      {
        // Not sortable: balance is derived in app code and never stored, so
        // there is no column for the database to order by.
        accessorKey: "balanceAgorot",
        header: () => <div className="text-end">{t("colBalance")}</div>,
        cell: ({ row }) => (
          <div className="text-end tabular-nums">
            {row.original.balanceAgorot > 0 ? (
              <span className="font-medium">
                {formatMoney(row.original.balanceAgorot, locale)}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        header: () => <span className="sr-only">{tc("actions")}</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <OrderRowActions
              id={row.original.id}
              orderNumber={row.original.orderNumber}
              statusCode={row.original.statusCode}
            />
          </div>
        ),
      },
    ],
    [
      locale,
      t,
      tOrders,
      tc,
      params.sort,
      params.dir,
      sortBy,
      scopedToCustomer,
      selected,
      allOnPage,
      someOnPage,
      toggleRow,
      toggleAll,
    ],
  );

  const selectionCount = selected.size;

  return (
    <>
      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        total={total}
        pageCount={pageCount}
        params={params}
        defaultFilter={
          (onDashboard ? DASHBOARD_ORDER_DEFAULTS : ORDER_LIST_DEFAULTS).filter
        }
        setParams={setParams}
        startTransition={startTransition}
        isPending={isPending}
        search={search}
        setSearch={setSearch}
        filterTabs={[
          { value: "all", label: tOrders("filterAll") },
          { value: "open", label: tOrders("filterOpen") },
          { value: "unpaid", label: tOrders("filterUnpaid") },
          { value: "recent", label: tOrders("filterRecent") },
        ]}
        columnLabels={{
          orderNumber: t("colOrder"),
          customerName: t("colCustomer"),
          createdAt: tOrders("date"),
          status: t("colStatus"),
          itemCount: t("colItems"),
          totalAgorot: t("colTotal"),
          balanceAgorot: t("colBalance"),
        }}
        strings={{
          // Scoped to one customer, "search customer" offers a search that
          // can only ever return the customer you are already looking at.
          searchPlaceholder: t(
            scopedToCustomer ? "searchPlaceholderScoped" : "searchPlaceholder",
          ),
          rowCount: t("rowCount", { count: total }),
          noResults: t("noResults"),
          noMatch: t("noMatch"),
        }}
        onRowClick={(row) => router.push(`/orders/${row.id}`)}
        isRowActive={(row) => selected.has(row.id)}
        aboveTable={
          /* Bulk bar — a separate strip, so the toolbar above never jumps.
             Always mounted and collapsed with grid-template-rows 0fr → 1fr: the
             one height animation the browser interpolates without us measuring
             the bar, which matters because it wraps to two rows on a narrow
             viewport. Its own top margin lives inside the collapsing region, so
             the spacing disappears with it. `inert` keeps the shut bar out of the
             tab order — a zero-height strip is still focusable otherwise. */
          <div
            data-open={selectionCount > 0}
            inert={selectionCount === 0}
            className={cn(
              "group grid grid-rows-[0fr] transition-[grid-template-rows]",
              "data-[open=true]:grid-rows-[1fr]",
              // Exit is quicker than entry: by then the user has moved on.
              "duration-150 ease-out-quint data-[open=true]:duration-200",
              "motion-reduce:transition-none",
            )}
          >
            <div className="overflow-hidden">
              <div
                className={cn(
                  "mt-4 flex flex-wrap items-center gap-2 rounded-card border bg-muted/40 px-3 py-2",
                  // The content fades and rises a hair rather than being squeezed
                  // out by the closing row.
                  "-translate-y-1 opacity-0 transition-[opacity,transform] duration-100 ease-out",
                  "group-data-[open=true]:translate-y-0 group-data-[open=true]:opacity-100",
                  // Entering, the fade trails the expansion; leaving, it leads, so
                  // the bar is gone before the row finishes closing.
                  "group-data-[open=true]:delay-75 group-data-[open=true]:duration-150",
                  // Reduced motion keeps the fade and drops the movement.
                  "motion-reduce:translate-y-0",
                )}
              >
                <span className="text-sm font-medium tabular-nums">
                  {t("nSelected", { count: selectionCount })}
                </span>
                <div className="ms-auto flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={bulkPending}
                    onClick={() => bulkStatus("done")}
                  >
                    <Check />
                    {tOrders("markDone")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={bulkPending}
                    onClick={() => bulkStatus("not_done")}
                  >
                    <RotateCcw />
                    {tOrders("markNotDone")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={bulkPending}
                    onClick={() => setConfirmingBulk(true)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 />
                    {tc("delete")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={t("clearSelection")}
                    onClick={() => setSelected(new Set())}
                  >
                    <X />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        }
      />

      <AlertDialog open={confirmingBulk} onOpenChange={setConfirmingBulk}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("bulkDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("bulkDeleteDescription", { count: selectionCount })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkPending}>
              {tc("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                bulkDelete();
              }}
              disabled={bulkPending}
              variant="destructive"
            >
              {tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
