import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { cn } from "@repo/ui/lib/utils";
import { Search, SlidersHorizontal } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

/**
 * The pieces of a list's chrome — toolbar, filter tabs, search box, Columns
 * button, footer — as plain markup. `DataTable` wires them to the URL;
 * `TableSkeleton` draws the very same markup before the rows arrive, so the
 * two cannot drift apart (ADR 0012). No hooks and no handlers of their own:
 * they render on the server as well as in the browser.
 */

/**
 * Grows a control's pressable area vertically without redrawing it. The
 * toolbar and pager are sized for a mouse; PRODUCT.md's in-shop phone scene
 * needs a thumb to hit them. Vertical only — these controls sit in horizontal
 * rows, so widening would make neighbours overlap.
 */
export const HIT_TALLER =
  "relative before:absolute before:-inset-y-1 before:inset-x-0 before:content-['']";

/** The row above the table: tabs, then search, then Columns at the end. */
export function ListToolbar({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-3", className)}
      {...props}
    />
  );
}

/** The list's filter, as a pill on a muted track. */
export function FilterTabs({
  tabs,
  value,
  onValueChange,
}: {
  tabs: readonly { value: string; label: string }[];
  value: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <Tabs value={value} onValueChange={onValueChange}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className={HIT_TALLER}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/**
 * The search box. It takes the room the tabs leave and, on a phone, shrinks
 * down to its icon rather than wrapping onto a row of its own.
 */
export function SearchBox({
  clear,
  ...props
}: ComponentProps<typeof Input> & {
  /** The button that empties the box, while there is something in it. */
  clear?: ReactNode;
}) {
  return (
    <div className="relative min-w-0 flex-1 sm:max-w-72">
      <Search className="pointer-events-none absolute inset-y-0 start-2.5 my-auto size-4 text-muted-foreground" />
      <Input {...props} className="h-9 ps-8 pe-8" />
      {clear}
    </div>
  );
}

/** Opens the column visibility menu; the label drops on a phone. */
export function ColumnsButton({
  label,
  className,
  ...props
}: ComponentProps<typeof Button> & { label: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("ms-auto", className)}
      {...props}
    >
      <SlidersHorizontal />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}

/** Under the table: the row count, then the pager when there is more than a page. */
export function ListFooter({
  count,
  children,
}: {
  count: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
      <div className="text-sm text-muted-foreground">{count}</div>
      {children}
    </div>
  );
}
