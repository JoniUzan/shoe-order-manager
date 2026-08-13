"use client";

import { Button } from "@repo/ui/components/button";
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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  type ReactNode,
  type TransitionStartFunction,
} from "react";

import { LIST_PAGE_SIZES, type ListParams } from "@/lib/list-params";

/**
 * The shell every list screen renders: toolbar, table, pager.
 *
 * All list state lives in the URL and is resolved on the server — this
 * component never filters, sorts or pages locally. It receives exactly the rows
 * it should render, and TanStack is here for column definitions and visibility,
 * not for row models. Everything list-specific (columns, selection, drawers)
 * belongs to the caller.
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
export const HIT_TALLER =
  "relative before:absolute before:-inset-y-1 before:inset-x-0 before:content-['']";

export function DataTable<TRow, F extends string, S extends string>({
  rows,
  columns,
  getRowId,
  total,
  pageCount,
  params,
  defaultFilter,
  setParams,
  startTransition,
  isPending,
  search,
  setSearch,
  filterTabs,
  columnLabels,
  strings,
  onRowClick,
  isRowActive,
  aboveTable,
}: {
  rows: TRow[];
  columns: ColumnDef<TRow>[];
  /** Stable row identity — the record's id, never the index. */
  getRowId: (row: TRow) => string;
  total: number;
  pageCount: number;
  params: ListParams<F, S>;
  /** The filter the list starts on — what "clear filters" returns to. */
  defaultFilter: F;
  setParams: (patch: Partial<ListParams<F, S>>) => void;
  /** The transition `setParams` runs in, so the filter pill can be optimistic. */
  startTransition: TransitionStartFunction;
  isPending: boolean;
  search: string;
  setSearch: (value: string) => void;
  filterTabs?: readonly { value: F; label: string }[];
  /** Column id → label, for the visibility menu. */
  columnLabels: Record<string, string>;
  strings: {
    searchPlaceholder: string;
    /** Already formatted, e.g. "12 customers". */
    rowCount: string;
    noResults: string;
    noMatch: string;
  };
  onRowClick?: (row: TRow) => void;
  isRowActive?: (row: TRow) => boolean;
  /** Slot between the toolbar and the table — a bulk-action bar, typically. */
  aboveTable?: ReactNode;
}) {
  const t = useTranslations("list");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isRtl = locale === "he";

  const [visibility, setVisibility] = useState<VisibilityState>({});

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

  // Reverts on its own if the navigation never lands, so the pill can never be
  // left marking a filter the list is not actually showing.
  const [filterView, setFilterView] = useOptimistic(params.filter);

  const table = useReactTable({
    data: rows,
    columns,
    state: { columnVisibility: visibility },
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
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

  const isNarrowed = params.q !== "" || params.filter !== defaultFilter;

  function clearFilters() {
    setSearch("");
    setParams({ q: "", filter: defaultFilter } as Partial<ListParams<F, S>>);
  }

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
        {filterTabs && filterTabs.length > 0 && (
          <Tabs
            value={filterView}
            onValueChange={(v) =>
              startTransition(() => {
                setFilterView(v as F);
                setParams({ filter: v as F } as Partial<ListParams<F, S>>);
              })
            }
          >
            <TabsList>
              {filterTabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={HIT_TALLER}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        <div className="relative min-w-0 flex-1 sm:max-w-72">
          <Search className="pointer-events-none absolute inset-y-0 start-2.5 my-auto size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={strings.searchPlaceholder}
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

      {aboveTable}

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
                      {isNarrowed ? strings.noMatch : strings.noResults}
                    </p>
                    {isNarrowed && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
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
                    isRowActive?.(row.original) ? "selected" : undefined
                  }
                  className={cn(onRowClick && "cursor-pointer")}
                  // On a phone most columns are off-screen, so the row itself
                  // is the way into the quick look — the first cell's link
                  // alone is a small target. Anything already interactive
                  // keeps its own job.
                  onClick={
                    onRowClick &&
                    ((e) => {
                      if (
                        (e.target as HTMLElement).closest(
                          "a,button,input,[role=checkbox],[role=menuitem]",
                        )
                      )
                        return;
                      onRowClick(row.original);
                    })
                  }
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
        <p className="text-sm text-muted-foreground">{strings.rowCount}</p>
        <div
          className={cn("flex items-center gap-4", pageCount <= 1 && "hidden")}
        >
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-sm text-muted-foreground">
              {t("rowsPerPage")}
            </span>
            <Select
              value={String(params.per)}
              onValueChange={(v) =>
                setParams({ per: Number(v) } as Partial<ListParams<F, S>>)
              }
            >
              <SelectTrigger size="sm" className="w-[4.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LIST_PAGE_SIZES.map((n) => (
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
              onClick={() => setParams({ page: 1 } as Partial<ListParams<F, S>>)}
              disabled={params.page <= 1}
              aria-label={t("firstPage")}
            >
              <First />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={HIT_TALLER}
              onClick={() =>
                setParams({ page: params.page - 1 } as Partial<ListParams<F, S>>)
              }
              disabled={params.page <= 1}
              aria-label={t("prevPage")}
            >
              <Prev />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={HIT_TALLER}
              onClick={() =>
                setParams({ page: params.page + 1 } as Partial<ListParams<F, S>>)
              }
              disabled={params.page >= pageCount}
              aria-label={t("nextPage")}
            >
              <Next />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={cn("hidden sm:inline-flex", HIT_TALLER)}
              onClick={() =>
                setParams({ page: pageCount } as Partial<ListParams<F, S>>)
              }
              disabled={params.page >= pageCount}
              aria-label={t("lastPage")}
            >
              <Last />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
