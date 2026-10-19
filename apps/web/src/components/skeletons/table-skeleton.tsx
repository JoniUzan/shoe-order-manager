import { Checkbox } from "@repo/ui/components/checkbox";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { cn } from "@repo/ui/lib/utils";
import { Ellipsis } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import {
  ColumnsButton,
  FilterTabs,
  ListFooter,
  ListToolbar,
  SearchBox,
} from "@/components/data-table/list-chrome";
import { SortHeader } from "@/components/data-table/sort-header";
import { TableFrame } from "@/components/data-table/table-frame";

import { SkeletonSection, vary } from "./skeleton-section";

/**
 * One column of a table's skeleton, mirroring the real column definition:
 * its heading, its `meta.cellClassName`, its `sortKey` and alignment.
 */
export type SkeletonColumn = {
  /** The heading, as the table shows it. None for the checkbox or actions column. */
  label?: string;
  /** The list sort the real heading asks for; drawn with the real `SortHeader`. */
  sortKey?: string;
  /** Money and counts sit at the end of their cell, heading included. */
  end?: boolean;
  /** The real column's `meta.cellClassName`, e.g. hidden on a phone. */
  cellClassName?: string;
  /**
   * What a cell holds: a line of text, badges side by side, a model's square
   * and its name, the row's checkbox, or the row's "⋯" menu.
   */
  cell?: "text" | "badges" | "thumb" | "check" | "action";
  /** The widest bar of text in the column, in px. */
  width?: number;
  /** For `badges`: each badge's width, in px, as the real ones measure. */
  badges?: number[];
  /** For `thumb`: the real square's size and corner classes. */
  thumb?: string;
};

/** The list state the skeleton draws: which tab is on, which column sorts. */
export type SkeletonListState = {
  filter: string;
  sort: string;
  dir: "asc" | "desc";
};

/**
 * A DataTable before its rows arrive, built from the DataTable's own parts:
 * the same toolbar, tabs, search box and Columns button (`list-chrome`), the
 * same `TableFrame` and headings (`SortHeader`), and the footer in its
 * first-load state of one page, where it holds only the row count. Only the
 * data is grey. The controls are drawn but inert: nothing answers yet.
 */
export function TableSkeleton({
  columns,
  rows = 10,
  state,
  toolbar = false,
  after,
  className,
}: {
  columns: SkeletonColumn[];
  rows?: number;
  state: SkeletonListState;
  /**
   * The toolbar as the real table draws it; false where the real one has
   * none. `columns` is whether any column can be hidden (the Columns button).
   */
  toolbar?:
    | {
        tabs?: readonly { value: string; label: string }[];
        searchPlaceholder?: string;
        columns: boolean;
      }
    | false;
  /** What the real table renders under itself, 16px below the footer. */
  after?: ReactNode;
  className?: string;
}) {
  const t = useTranslations("list");
  const tc = useTranslations("common");

  return (
    <SkeletonSection className={className}>
      <div inert className="flex flex-col">
        {toolbar && (
          <ListToolbar>
            {toolbar.tabs && toolbar.tabs.length > 0 && (
              <FilterTabs tabs={toolbar.tabs} value={state.filter} />
            )}
            {toolbar.searchPlaceholder !== undefined && (
              <SearchBox
                readOnly
                placeholder={toolbar.searchPlaceholder}
                aria-label={tc("search")}
              />
            )}
            {toolbar.columns && <ColumnsButton label={t("columns")} />}
          </ListToolbar>
        )}

        <TableFrame className={cn(toolbar && "mt-4")}>
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                {columns.map((column, c) => (
                  <TableHead key={c} className={column.cellClassName}>
                    <Heading column={column} state={state} />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: rows }, (_, r) => (
                <TableRow key={r}>
                  {columns.map((column, c) => (
                    <TableCell key={c} className={column.cellClassName}>
                      <Cell column={column} row={r + c} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableFrame>

        <ListFooter
          count={
            <div className="flex h-5 items-center">
              <Skeleton className="h-3.5 w-16" />
            </div>
          }
        />

        {after && <div className="mt-4">{after}</div>}
      </div>
    </SkeletonSection>
  );
}

function Heading({
  column,
  state,
}: {
  column: SkeletonColumn;
  state: SkeletonListState;
}) {
  if (column.cell === "check") return <Checkbox tabIndex={-1} />;
  if (!column.label) return null;
  if (column.sortKey) {
    return (
      <SortHeader
        label={column.label}
        sortKey={column.sortKey}
        align={column.end ? "end" : undefined}
        active={state.sort === column.sortKey}
        dir={state.dir}
      />
    );
  }
  return column.end ? (
    <div className="text-end">{column.label}</div>
  ) : (
    column.label
  );
}

function Cell({ column, row }: { column: SkeletonColumn; row: number }) {
  const width = vary(row, column.width ?? 96);
  switch (column.cell) {
    case "check":
      return <Checkbox tabIndex={-1} />;
    case "action":
      // The real row's ghost "⋯" button, at its size.
      return (
        <div className="flex justify-end">
          <span className="flex size-8 items-center justify-center text-muted-foreground">
            <Ellipsis className="size-4" />
          </span>
        </div>
      );
    case "badges":
      return (
        <div className="flex gap-1.5">
          {(column.badges ?? [64]).map((w, i) => (
            <Skeleton
              key={i}
              className="h-5.5 shrink-0 rounded-full"
              style={{ width: w }}
            />
          ))}
        </div>
      );
    case "thumb":
      return (
        <div className="flex items-center gap-3">
          <Skeleton
            className={cn("shrink-0 border border-border", column.thumb)}
          />
          <Skeleton className="h-3.5" style={{ width }} />
        </div>
      );
    default:
      return (
        <Skeleton
          className={cn("h-3.5", column.end && "ms-auto")}
          style={{ width }}
        />
      );
  }
}
