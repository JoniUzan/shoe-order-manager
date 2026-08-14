"use client";

import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

/**
 * A sortable column heading. Sorting is URL state resolved on the server, so
 * this only reports which key is active and asks for the next one.
 *
 * The `aria-sort` state lives on the header cell, not here — declare the
 * column's `meta.sortKey` and `<DataTable>` puts it where a screen reader
 * looks for it.
 */
export function SortHeader<S extends string>({
  label,
  sortKey,
  align,
  active,
  dir,
  onSort,
}: {
  label: string;
  sortKey: S;
  align?: "end";
  active: boolean;
  dir: "asc" | "desc";
  onSort: (key: S) => void;
}) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  const icon = (
    <Icon className={cn("size-3.5", active ? "opacity-100" : "opacity-50")} />
  );
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onSort(sortKey)}
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
