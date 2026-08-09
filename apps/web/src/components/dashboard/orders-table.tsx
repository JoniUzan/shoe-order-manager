"use client";

import { formatMoney } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
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
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { OrderStatusBadge, PaymentBadge } from "@/components/orders/badges";
import { Link } from "@/i18n/navigation";

export type OrderRow = {
  id: string;
  orderNumber: number;
  customerId: string;
  customerName: string;
  createdAt: string;
  statusCode: string;
  paymentStatus: string;
  totalAgorot: number;
  balanceAgorot: number;
  itemCount: number;
};

export function OrdersTable({ rows }: { rows: OrderRow[] }) {
  const t = useTranslations("dashboard");
  const tOrders = useTranslations("orders");
  const locale = useLocale();
  const isRtl = locale === "he";

  const [tab, setTab] = useState<"all" | "open" | "unpaid">("all");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "orderNumber", desc: true },
  ]);
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [active, setActive] = useState<OrderRow | null>(null);

  const data = useMemo(() => {
    if (tab === "open") return rows.filter((r) => r.statusCode !== "done");
    if (tab === "unpaid") return rows.filter((r) => r.paymentStatus !== "paid");
    return rows;
  }, [rows, tab]);

  const columns = useMemo<ColumnDef<OrderRow>[]>(
    () => [
      {
        accessorKey: "orderNumber",
        header: ({ column }) => (
          <SortButton column={column} label={t("colOrder")} />
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
        header: t("colCustomer"),
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
        header: ({ column }) => (
          <SortButton column={column} label={tOrders("date")} />
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
        header: t("colItems"),
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {row.original.itemCount}
          </span>
        ),
      },
      {
        accessorKey: "totalAgorot",
        header: ({ column }) => (
          <SortButton column={column} label={t("colTotal")} align="end" />
        ),
        cell: ({ row }) => (
          <div className="text-end font-medium tabular-nums">
            {formatMoney(row.original.totalAgorot, locale)}
          </div>
        ),
      },
      {
        accessorKey: "balanceAgorot",
        header: ({ column }) => (
          <SortButton column={column} label={t("colBalance")} align="end" />
        ),
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
    ],
    [locale, t, tOrders],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility: visibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const Prev = isRtl ? ChevronRight : ChevronLeft;
  const Next = isRtl ? ChevronLeft : ChevronRight;

  const columnLabels: Record<string, string> = {
    orderNumber: t("colOrder"),
    customerName: t("colCustomer"),
    createdAt: tOrders("date"),
    status: t("colStatus"),
    itemCount: t("colItems"),
    totalAgorot: t("colTotal"),
    balanceAgorot: t("colBalance"),
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="all">{tOrders("filterAll")}</TabsTrigger>
            <TabsTrigger value="open">{tOrders("filterOpen")}</TabsTrigger>
            <TabsTrigger value="unpaid">{tOrders("filterUnpaid")}</TabsTrigger>
          </TabsList>
        </Tabs>

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

      <div className="overflow-hidden rounded-card border">
        <Table>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>
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
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("noResults")}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {t("rowCount", { count: table.getFilteredRowModel().rows.length })}
        </p>
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-sm text-muted-foreground">
              {t("rowsPerPage")}
            </span>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(v) => table.setPageSize(Number(v))}
            >
              <SelectTrigger size="sm" className="w-[4.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm tabular-nums text-muted-foreground">
            {t("pageOf", {
              page: table.getState().pagination.pageIndex + 1,
              total: Math.max(table.getPageCount(), 1),
            })}
          </span>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label={t("prevPage")}
            >
              <Prev />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label={t("nextPage")}
            >
              <Next />
            </Button>
          </div>
        </div>
      </div>

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
                <Row label={t("colItems")} value={String(active.itemCount)} />
                <Row
                  label={t("colTotal")}
                  value={formatMoney(active.totalAgorot, locale)}
                />
                <Row
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
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function SortButton({
  column,
  label,
  align,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  column: any;
  label: string;
  align?: "end";
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className={`-mx-2 h-8 ${align === "end" ? "ms-auto flex" : ""}`}
    >
      {label}
      <ArrowUpDown className="size-3.5 opacity-60" />
    </Button>
  );
}
