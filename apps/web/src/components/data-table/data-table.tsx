"use client";

import { Button } from "@repo/ui/components/button";
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
import { cn } from "@repo/ui/lib/utils";
import {
  columnVisibilityFeature,
  flexRender,
  metaHelper,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
  type ColumnVisibilityState,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  useOptimistic,
  useState,
  type ReactNode,
  type TransitionStartFunction,
} from "react";

import {
  ColumnsButton,
  FilterTabs,
  HIT_TALLER,
  ListFooter,
  ListToolbar,
  SearchBox,
} from "@/components/data-table/list-chrome";
import { TableFrame } from "@/components/data-table/table-frame";
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

type DataTableColumnMeta = {
  /** Applied to this column's header cell and every body cell alike. */
  cellClassName?: string;
  /**
   * The list sort this column maps to. `aria-sort` belongs on the header
   * cell, not on the button inside it, so the shell needs to know which
   * column the current sort refers to.
   */
  sortKey?: string;
};

/**
 * Column visibility is the only TanStack feature in use: the server already
 * filtered, sorted and paged, so no row model is registered.
 */
const features = tableFeatures({
  columnVisibilityFeature,
  columnMeta: metaHelper<DataTableColumnMeta>(),
});

/** A column of a DataTable. */
export type DataTableColumn<TRow extends RowData> = ColumnDef<typeof features, TRow>;

export { HIT_TALLER };

export function DataTable<TRow extends RowData, F extends string, S extends string>({
  rows,
  columns,
  getRowId,
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
  showToolbar = true,
}: {
  rows: TRow[];
  columns: DataTableColumn<TRow>[];
  /** Stable row identity — the record's id, never the index. */
  getRowId: (row: TRow) => string;
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
    /** Omit to render no search box — a list nothing is worth typing at. */
    searchPlaceholder?: string;
    /** Already formatted, e.g. "12 customers". */
    rowCount: string;
    noResults: string;
    noMatch: string;
  };
  /**
   * Whether this list is big enough to be worth steering. False drops the
   * toolbar whole — a three-line order should not carry four controls.
   * Decide it from the *unfiltered* count, or the toolbar disappears under
   * the filter that is still narrowing the list.
   */
  showToolbar?: boolean;
  onRowClick?: (row: TRow) => void;
  isRowActive?: (row: TRow) => boolean;
  /** Slot between the toolbar and the table — a bulk-action bar, typically. */
  aboveTable?: ReactNode;
}) {
  const t = useTranslations("list");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isRtl = locale === "he";

  const [visibility, setVisibility] = useState<ColumnVisibilityState>({});

  // Reverts on its own if the navigation never lands, so the pill can never be
  // left marking a filter the list is not actually showing.
  const [filterView, setFilterView] = useOptimistic(params.filter);

  const table = useTable({
    features,
    data: rows,
    columns,
    state: { columnVisibility: visibility },
    onColumnVisibilityChange: setVisibility,
    getRowId,
  });

  const Prev = isRtl ? ChevronRight : ChevronLeft;
  const Next = isRtl ? ChevronLeft : ChevronRight;
  const First = isRtl ? ChevronsRight : ChevronsLeft;
  const Last = isRtl ? ChevronsLeft : ChevronsRight;

  const hasSearch = strings.searchPlaceholder !== undefined;
  const hideableColumns = table.getAllColumns().filter((c) => c.getCanHide());

  // Only what the toolbar can actually undo counts as narrowing: offering
  // "clear filters" over a `q` with no box to type it in would clear something
  // the reader cannot see.
  const isNarrowed =
    (hasSearch && params.q !== "") || params.filter !== defaultFilter;

  function clearFilters() {
    // `setParams` resets the search box itself — it is the one that knows the
    // debounce has been overtaken.
    setParams({ q: "", filter: defaultFilter });
  }

  return (
    // Spacing is per-child rather than a container `gap`: the bulk bar below
    // collapses to zero height, and a gap would still reserve a row for it,
    // leaving a hole under the toolbar whenever nothing is selected.
    <div className="flex flex-col">
      {/* Toolbar */}
      {showToolbar && (
        <ListToolbar>
          {/* The filter is URL state, so a plain controlled value would leave the
            pill sitting still until the server answered — measured at 183ms of
            dead time before it even started to move. The optimistic value lets
            it leave on the click and reconcile when the rows arrive. */}
          {filterTabs && filterTabs.length > 0 && (
            <FilterTabs
              tabs={filterTabs}
              value={filterView}
              onValueChange={(v) =>
                startTransition(() => {
                  setFilterView(v as F);
                  setParams({ filter: v as F });
                })
              }
            />
          )}

          {/* A list you cannot usefully search gets no box. The sales report is
            bucketed by date, and typing at a month is not how anybody looks
            for one — its query never read `q` at all, so the box that used to
            stand here was answering nothing. */}
          {hasSearch && (
            <SearchBox
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={strings.searchPlaceholder}
              aria-label={tc("search")}
              clear={
                search !== "" && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label={t("clearSearch")}
                    className="absolute inset-y-0 end-2 my-auto flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )
              }
            />
          )}

          {/* Every column pinned means the menu can only ever open on nothing. */}
          {hideableColumns.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ColumnsButton label={t("columns")} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {hideableColumns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {columnLabels[column.id] ?? column.id}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </ListToolbar>
      )}

      {aboveTable}

      <TableFrame
        className={cn(showToolbar && "mt-4")}
        isPending={isPending}
        watch={[rows, visibility]}
      >
        <Table>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => {
                  const sortKey = header.column.columnDef.meta?.sortKey;
                  return (
                    <TableHead
                      key={header.id}
                      className={header.column.columnDef.meta?.cellClassName}
                      // On the cell, not on the button inside it: `aria-sort`
                      // is only meaningful on a columnheader.
                      aria-sort={
                        !sortKey
                          ? undefined
                          : params.sort !== sortKey
                            ? "none"
                            : params.dir === "asc"
                              ? "ascending"
                              : "descending"
                      }
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
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
                  // is the way in (a quick look, or the record's page) — the
                  // first cell's link alone is a small target. Anything
                  // already interactive keeps its own job.
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
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableFrame>

      {/* Footer — a pager over an empty result is chrome that only says no */}
      <ListFooter count={strings.rowCount}>
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
      </ListFooter>
    </div>
  );
}
