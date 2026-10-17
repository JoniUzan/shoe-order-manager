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

import { TableFrame } from "@/components/data-table/table-frame";

import { SkeletonSection, vary } from "./skeleton-section";

export type SkeletonColumn = {
  /** The heading, as the table shows it. None for a checkbox or actions column. */
  label?: string;
  /** What a cell holds: a line of text, a status pill, a thumbnail and a name, a checkbox, a menu. */
  cell?: "text" | "pill" | "thumb" | "check" | "action";
  /** The widest bar in the column, in px. */
  width?: number;
  /** Money and counts sit at the end of their cell. */
  end?: boolean;
  /** The column's own cell classes, e.g. hidden on a phone as the real one is. */
  className?: string;
};

/**
 * A DataTable before its rows arrive: the toolbar's shapes, the real column
 * headings in the real frame, `rows` rows of bars, and the pager. A bar never
 * grows past its column, so on a phone the table scrolls as the real one does.
 */
export function TableSkeleton({
  columns,
  rows = 10,
  toolbar = { tabs: 3, search: true },
  pager = true,
  className,
}: {
  columns: SkeletonColumn[];
  rows?: number;
  /** The filter tabs and the search box; false for a table without them. */
  toolbar?: { tabs: number; search: boolean } | false;
  pager?: boolean;
  className?: string;
}) {
  return (
    <SkeletonSection className={cn("flex flex-col", className)}>
      {toolbar && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {toolbar.tabs > 0 && (
            <Skeleton
              className="h-9 shrink-0 rounded-lg"
              style={{ width: `${toolbar.tabs * 4.5}rem` }}
            />
          )}
          {toolbar.search && (
            <Skeleton className="h-9 min-w-0 flex-1 basis-40 sm:max-w-72" />
          )}
          <Skeleton className="ms-auto h-8 w-9 sm:w-24" />
        </div>
      )}

      <TableFrame>
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              {columns.map((column, c) => (
                <TableHead
                  key={c}
                  className={cn(column.end && "text-end", column.className)}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }, (_, r) => (
              <TableRow key={r}>
                {columns.map((column, c) => (
                  <TableCell key={c} className={column.className}>
                    <Cell column={column} row={r + c} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableFrame>

      {pager && (
        <div className="mt-4 flex items-center justify-between gap-4">
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-1.5">
            <Skeleton className="size-8" />
            <Skeleton className="size-8" />
          </div>
        </div>
      )}
    </SkeletonSection>
  );
}

function Cell({ column, row }: { column: SkeletonColumn; row: number }) {
  const width = vary(row, column.width ?? 96);
  switch (column.cell) {
    case "check":
      return <Skeleton className="size-4 rounded-[4px]" />;
    case "action":
      return <Skeleton className="ms-auto size-6" />;
    case "pill":
      return (
        <Skeleton
          className="h-5.5 max-w-full rounded-full"
          style={{ width: Math.max(width, 56) }}
        />
      );
    case "thumb":
      return (
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <Skeleton className="h-3.5 max-w-full" style={{ width }} />
        </div>
      );
    default:
      return (
        <Skeleton
          className={cn("h-3.5 max-w-full", column.end && "ms-auto")}
          style={{ width }}
        />
      );
  }
}
