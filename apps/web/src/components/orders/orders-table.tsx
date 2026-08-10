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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@repo/ui/components/drawer";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Input } from "@repo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { cn } from "@repo/ui/lib/utils";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";

import { OrderStatusBadge, PaymentBadge } from "@/components/orders/badges";
import { OrderRowActions } from "@/components/orders/order-row-actions";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { deleteOrders, setOrdersStatus } from "@/lib/actions/orders";
import {
  ORDER_PAGE_SIZES,
  orderListToQuery,
  type OrderFilter,
  type OrderListParams,
  type OrderRow,
  type OrderSort,
} from "@/lib/orders-query";

/**
 * The orders table, shared by the dashboard and /orders.
 *
 * All list state (search, filter, sort, page) lives in the URL and is resolved
 * on the server — this component never filters or sorts locally. It receives
 * exactly the rows it should render.
 */

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Applied to this column's header cell and every body cell alike. */
    cellClassName?: string;
  }
}

/**
 * Grows a control's pressable area vertically without redrawing it. The
 * toolbar and pager are sized for a mouse; PRODUCT.md's in-shop phone scene
 * needs a thumb to hit them. Vertical only — these controls sit in horizontal
 * rows, so widening would make neighbours overlap.
 */
const HIT_TALLER =
  "relative before:absolute before:-inset-y-1 before:inset-x-0 before:content-['']";

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
}: {
  rows: OrderRow[];
  total: number;
  pageCount: number;
  params: OrderListParams;
}) {
  const t = useTranslations("dashboard");
  const tOrders = useTranslations("orders");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isRtl = locale === "he";

  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [active, setActive] = useState<OrderRow | null>(null);

  /* ---------------------------------------------------------- scroll edges */

  // A table wider than the phone silently hides the money columns behind a
  // clipped edge — it looks finished when it isn't. These flags drive a fade
  // at whichever edge still has content behind it.
  const tableWrap = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const el = tableWrap.current?.querySelector<HTMLElement>(
      '[data-slot="table-container"]',
    );
    if (!el) return;
    const update = () => {
      // Chrome reports a negative scrollLeft in RTL; distance is what matters.
      const x = Math.abs(el.scrollLeft);
      const max = el.scrollWidth - el.clientWidth;
      setEdges({ start: x > 1, end: max - x > 1 });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [rows, visibility]);

  /* ---------------------------------------------------------------- URL state */

  const setParams = useCallback(
    (patch: Partial<OrderListParams>) => {
      const next = { ...params, ...patch };
      // Anything that changes *which* rows match sends you back to page 1 —
      // otherwise a narrowing search strands you on an empty page 8.
      if (patch.page === undefined) next.page = 1;
      const qs = orderListToQuery(next);
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [params, pathname, router],
  );

  /* ------------------------------------------------------------------ search */

  // Reverts on its own if the navigation never lands, so the pill can never be
  // left marking a filter the list is not actually showing.
  const [filterView, setFilterView] = useOptimistic(params.filter);

  const [search, setSearch] = useState(params.q);
  const debounced = useDebouncedValue(search, 300);
  // What we last handed to the URL, so the two effects below can't chase
  // each other: one pushes typing up, the other pulls external changes down.
  const lastPushed = useRef(params.q);

  useEffect(() => {
    if (debounced === lastPushed.current) return;
    lastPushed.current = debounced;
    setParams({ q: debounced });
  }, [debounced, setParams]);

  useEffect(() => {
    if (params.q !== lastPushed.current) {
      lastPushed.current = params.q;
      setSearch(params.q);
    }
  }, [params.q]);

  /* --------------------------------------------------------------- selection */

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmingBulk, setConfirmingBulk] = useState(false);
  const [bulkPending, startBulk] = useTransition();

  // Selection is per-view: it clears whenever the visible set changes. Acting
  // in bulk on rows you can no longer see is the one mistake worth designing out.
  const viewKey = orderListToQuery(params);
  useEffect(() => {
    setSelected(new Set());
  }, [viewKey]);

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
        header: () => (
          <SortHeader
            label={t("colOrder")}
            sortKey="orderNumber"
            params={params}
            onSort={sortBy}
          />
        ),
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setActive(row.original)}
            className="font-medium tabular-nums underline-offset-4 hover:underline"
          >
            <bdi>#{row.original.orderNumber}</bdi>
          </button>
        ),
      },
      {
        accessorKey: "customerName",
        header: () => (
          <SortHeader
            label={t("colCustomer")}
            sortKey="customerName"
            params={params}
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
      },
      {
        accessorKey: "createdAt",
        // Dropped first on narrow screens: the phone scenes are "who owes me"
        // and "did this get paid", and the order number already implies recency.
        meta: { cellClassName: "hidden md:table-cell" },
        header: () => (
          <SortHeader
            label={tOrders("date")}
            sortKey="createdAt"
            params={params}
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
        header: () => (
          <SortHeader
            label={t("colTotal")}
            sortKey="totalAgorot"
            align="end"
            params={params}
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
      params,
      sortBy,
      selected,
      allOnPage,
      someOnPage,
      toggleRow,
      toggleAll,
    ],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { columnVisibility: visibility },
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    // The server already filtered, sorted and paged; TanStack only renders.
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount,
    rowCount: total,
  });

  const Prev = isRtl ? ChevronRight : ChevronLeft;
  const Next = isRtl ? ChevronLeft : ChevronRight;
  const First = isRtl ? ChevronsRight : ChevronsLeft;
  const Last = isRtl ? ChevronsLeft : ChevronsRight;

  const columnLabels: Record<string, string> = {
    orderNumber: t("colOrder"),
    customerName: t("colCustomer"),
    createdAt: tOrders("date"),
    status: t("colStatus"),
    itemCount: t("colItems"),
    totalAgorot: t("colTotal"),
    balanceAgorot: t("colBalance"),
  };

  const isNarrowed = params.q !== "" || params.filter !== "all";
  const selectionCount = selected.size;

  return (
    // Spacing is per-child rather than a container `gap`: the bulk bar below
    // collapses to zero height, and a gap would still reserve a row for it,
    // leaving a hole under the toolbar whenever nothing is selected.
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* The filter is URL state, so a plain controlled value would leave the
            pill sitting still until the server answered — measured at 183ms of
            dead time before it even started to move. The optimistic value lets
            it leave on the click and reconcile when the rows arrive. */}
        <Tabs
          value={filterView}
          onValueChange={(v) =>
            startTransition(() => {
              setFilterView(v as OrderFilter);
              setParams({ filter: v as OrderFilter });
            })
          }
        >
          <TabsList>
            <TabsTrigger value="all" className={HIT_TALLER}>
              {tOrders("filterAll")}
            </TabsTrigger>
            <TabsTrigger value="open" className={HIT_TALLER}>
              {tOrders("filterOpen")}
            </TabsTrigger>
            <TabsTrigger value="unpaid" className={HIT_TALLER}>
              {tOrders("filterUnpaid")}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative min-w-0 flex-1 sm:max-w-72">
          <Search className="pointer-events-none absolute inset-y-0 start-2.5 my-auto size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={tc("search")}
            className="h-9 ps-8 pe-8"
          />
          {search !== "" && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label={t("clearSearch")}
              className="absolute inset-y-0 end-2 my-auto flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ms-auto">
              <SlidersHorizontal />
              <span className="hidden sm:inline">{t("columns")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((c) => c.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {columnLabels[column.id] ?? column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bulk bar — a separate strip, so the toolbar above never jumps.
          Always mounted and collapsed with grid-template-rows 0fr → 1fr: the
          one height animation the browser interpolates without us measuring
          the bar, which matters because it wraps to two rows on a narrow
          viewport. Its own top margin lives inside the collapsing region, so
          the spacing disappears with it. `inert` keeps the shut bar out of the
          tab order — a zero-height strip is still focusable otherwise. */}
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

      <div
        ref={tableWrap}
        className={cn(
          "relative mt-4 overflow-hidden rounded-card border transition-opacity duration-150",
          isPending && "opacity-60",
        )}
      >
        {(["start", "end"] as const).map((side) =>
          edges[side] ? (
            <div
              key={side}
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-y-0 z-10 w-12",
                side === "start" ? "start-0" : "end-0",
              )}
              style={{
                background: `linear-gradient(to ${
                  (side === "end") === isRtl ? "right" : "left"
                }, var(--background), transparent)`,
              }}
            />
          ) : null,
        )}
        <Table>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.column.columnDef.meta?.cellClassName}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-28">
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <p className="text-sm text-muted-foreground">
                      {isNarrowed ? t("noMatch") : t("noResults")}
                    </p>
                    {isNarrowed && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearch("");
                          setParams({ q: "", filter: "all" });
                        }}
                      >
                        {t("clearFilters")}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={
                    selected.has(row.original.id) ? "selected" : undefined
                  }
                  className="cursor-pointer"
                  // On a phone most columns are off-screen, so the row itself
                  // is the way into the quick look — the order-number button
                  // alone is a 35x20 target. Anything already interactive
                  // keeps its own job.
                  onClick={(e) => {
                    if (
                      (e.target as HTMLElement).closest(
                        "a,button,input,[role=checkbox],[role=menuitem]",
                      )
                    )
                      return;
                    setActive(row.original);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cell.column.columnDef.meta?.cellClassName}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer — a pager over an empty result is chrome that only says no */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {t("rowCount", { count: total })}
        </p>
        <div
          className={cn("flex items-center gap-4", pageCount <= 1 && "hidden")}
        >
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-sm text-muted-foreground">
              {t("rowsPerPage")}
            </span>
            <Select
              value={String(params.per)}
              onValueChange={(v) => setParams({ per: Number(v) })}
            >
              <SelectTrigger size="sm" className="w-[4.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_PAGE_SIZES.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm tabular-nums text-muted-foreground">
            {t("pageOf", { page: params.page, total: pageCount })}
          </span>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className={cn("hidden sm:inline-flex", HIT_TALLER)}
              onClick={() => setParams({ page: 1 })}
              disabled={params.page <= 1}
              aria-label={t("firstPage")}
            >
              <First />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={HIT_TALLER}
              onClick={() => setParams({ page: params.page - 1 })}
              disabled={params.page <= 1}
              aria-label={t("prevPage")}
            >
              <Prev />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={HIT_TALLER}
              onClick={() => setParams({ page: params.page + 1 })}
              disabled={params.page >= pageCount}
              aria-label={t("nextPage")}
            >
              <Next />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={cn("hidden sm:inline-flex", HIT_TALLER)}
              onClick={() => setParams({ page: pageCount })}
              disabled={params.page >= pageCount}
              aria-label={t("lastPage")}
            >
              <Last />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick look */}
      <Drawer
        open={active !== null}
        onOpenChange={(open) => !open && setActive(null)}
        direction={isRtl ? "left" : "right"}
      >
        <DrawerContent>
          {active && (
            <>
              <DrawerHeader>
                <DrawerTitle>
                  <bdi>#{active.orderNumber}</bdi> · {active.customerName}
                </DrawerTitle>
                <DrawerDescription>
                  {new Date(active.createdAt).toLocaleDateString(locale, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </DrawerDescription>
              </DrawerHeader>
              <div className="flex flex-col gap-3 px-4 text-sm">
                <div className="flex gap-1.5">
                  <OrderStatusBadge code={active.statusCode} />
                  <PaymentBadge status={active.paymentStatus} />
                </div>
                <DetailRow
                  label={t("colItems")}
                  value={String(active.itemCount)}
                />
                <DetailRow
                  label={t("colTotal")}
                  value={formatMoney(active.totalAgorot, locale)}
                />
                <DetailRow
                  label={t("colBalance")}
                  value={
                    active.balanceAgorot > 0
                      ? formatMoney(active.balanceAgorot, locale)
                      : "—"
                  }
                />
              </div>
              <DrawerFooter>
                <Button asChild>
                  <Link href={`/orders/${active.id}`}>{t("openOrder")}</Link>
                </Button>
                <DrawerClose asChild>
                  <Button variant="outline">{t("close")}</Button>
                </DrawerClose>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>

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
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  align,
  params,
  onSort,
}: {
  label: string;
  sortKey: OrderSort;
  align?: "end";
  params: OrderListParams;
  onSort: (key: OrderSort) => void;
}) {
  const active = params.sort === sortKey;
  const Icon = !active ? ArrowUpDown : params.dir === "asc" ? ArrowUp : ArrowDown;
  const icon = (
    <Icon className={cn("size-3.5", active ? "opacity-100" : "opacity-50")} />
  );
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onSort(sortKey)}
      aria-sort={active ? (params.dir === "asc" ? "ascending" : "descending") : "none"}
      // The negative margin cancels the header cell's padding *plus* the
      // button's own, so the label lands on the same edge as the values below
      // it — a numeric column whose heading floats off its figures reads as
      // two different columns. Icon leads on end-aligned headers so the label,
      // not the arrow, is what sits flush against that edge.
      className={cn(
        "h-8",
        align === "end" ? "-me-2.5 ms-auto flex" : "-ms-2.5",
        active && "text-foreground",
      )}
    >
      {align === "end" ? (
        <>
          {icon}
          {label}
        </>
      ) : (
        <>
          {label}
          {icon}
        </>
      )}
    </Button>
  );
}
