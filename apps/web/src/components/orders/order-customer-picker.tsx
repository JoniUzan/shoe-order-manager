"use client";

import { Input } from "@repo/ui/components/input";
import { cn } from "@repo/ui/lib/utils";
import { CheckIcon, Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";

import {
  NewCustomerSheet,
  type CreatedCustomer,
} from "@/components/customers/new-customer-sheet";
import { roomy } from "@/components/step-form/roomy";

export interface PickerCustomer {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
}

/** The short line under a Customer's name: where they are, else their phone. */
export function customerLine(c: Pick<PickerCustomer, "phone" | "address">) {
  return [c.address, c.phone].filter(Boolean).join(" · ");
}

/**
 * The Customer step: a search box over the list of Customers, each one a
 * radio. Enter in the search with a single match picks it, so typing a few
 * letters and Enter is a whole step. "New customer" at the end of the list
 * adds one in a sheet, starting from what was searched, and picks it.
 */
export function OrderCustomerPicker({
  customers,
  value,
  onChange,
  onCreate,
  error,
}: {
  customers: PickerCustomer[];
  value: string;
  onChange: (id: string) => void;
  /** A Customer was added in the sheet; it's picked right after. */
  onCreate: (customer: CreatedCustomer) => void;
  error?: string;
}) {
  const t = useTranslations("orders");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const q = query.trim().toLocaleLowerCase();
  const shown = q
    ? customers.filter((c) =>
        [c.name, c.address, c.phone].some((s) => s?.toLocaleLowerCase().includes(q)),
      )
    : customers;

  function onSearchKey(e: KeyboardEvent<HTMLInputElement>) {
    // Before the form's submit runs (which continues), so the pick counts.
    if (e.key === "Enter" && shown.length === 1) onChange(shown[0]!.id);
  }

  return (
    <div className="flex flex-col gap-3">
      <CustomerSearch
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onSearchKey}
      />

      {/* Under the search, not under the list: a long list would hide it. */}
      {error && <p className={cn("text-sm text-destructive", roomy.appear)}>{error}</p>}

      <div role="radiogroup" aria-label={t("customer")} className="flex flex-col gap-1">
        {shown.map((c) => {
          const selected = c.id === value;
          const line = customerLine(c);
          return (
            <label
              key={c.id}
              className={cn(
                CUSTOMER_ROW,
                "cursor-pointer",
                "transition-[background-color,box-shadow] duration-150 ease-[ease]",
                "has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
                selected
                  ? "bg-card shadow-[var(--shadow-card)] md:bg-surface md:shadow-none md:ring-[1.5px] md:ring-foreground"
                  : "hover:bg-surface",
              )}
            >
              <input
                type="radio"
                name="customer"
                className="sr-only"
                checked={selected}
                onChange={() => onChange(c.id)}
              />
              <CustomerAvatar>{c.name.trim().charAt(0)}</CustomerAvatar>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn("truncate", selected ? "font-semibold" : "font-medium")}>
                  {c.name}
                </span>
                {line && (
                  <span className="truncate text-[0.8125rem] text-muted-foreground">{line}</span>
                )}
              </span>
              {selected && (
                <span
                  aria-hidden
                  className={cn(
                    "flex size-6.5 shrink-0 items-center justify-center rounded-full bg-foreground text-background",
                    "transition-[opacity,scale] duration-150 ease-out-quint starting:opacity-0 motion-safe:starting:scale-90",
                  )}
                >
                  <CheckIcon className="size-3.5" />
                </span>
              )}
            </label>
          );
        })}
        {shown.length === 0 && (
          <p className="px-3.5 py-3 text-muted-foreground">{t("noMatches")}</p>
        )}
        <NewCustomerRow onClick={() => setAdding(true)} />
      </div>

      <NewCustomerSheet
        open={adding}
        onOpenChange={setAdding}
        defaultName={query.trim()}
        onCreated={(customer) => {
          // The search may not match the new name: clear it so the new
          // Customer shows, picked.
          setQuery("");
          onCreate(customer);
          onChange(customer.id);
        }}
      />
    </div>
  );
}

/** A row of the Customer list: a Customer to pick, or "New customer". */
export const CUSTOMER_ROW = "flex min-h-16 items-center gap-3 rounded-2xl px-3.5 py-3";

/** The search over the Customer list. */
export function CustomerSearch(props: ComponentProps<typeof Input>) {
  const t = useTranslations("orders");
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        placeholder={t("searchCustomer")}
        aria-label={t("searchCustomer")}
        className={cn(roomy.field, "ps-11")}
        {...props}
      />
    </div>
  );
}

/** A Customer's round badge with the first letter of their name. */
export function CustomerAvatar({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-sm font-semibold"
    >
      {children}
    </span>
  );
}

/** "New customer" at the end of the list, with a dashed circle. */
export function NewCustomerRow({ onClick }: { onClick: () => void }) {
  const tc = useTranslations("customers");
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        CUSTOMER_ROW,
        "text-start font-medium",
        "outline-none hover:bg-surface focus-visible:ring-[3px] focus-visible:ring-ring/50",
        roomy.press,
      )}
    >
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed border-foreground/20"
      >
        <Plus className="size-4.5" />
      </span>
      {tc("new")}
    </button>
  );
}
