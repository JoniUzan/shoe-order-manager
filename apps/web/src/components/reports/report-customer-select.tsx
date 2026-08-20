"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { Combobox } from "@/components/ui/combobox";
import { useRouter } from "@/i18n/navigation";

/**
 * Which customer the by-customer report is about.
 *
 * The same `Combobox` the order form uses, for the same reason: this is the
 * one control standing between the reader and the whole report, and picking
 * from it by scrolling an unfiltered list of every store is slower than typing
 * three letters of the name.
 */
export function ReportCustomerSelect({
  customers,
  selected,
  placeholder,
}: {
  customers: { id: string; name: string }[];
  selected?: string;
  placeholder: string;
}) {
  const router = useRouter();
  const t = useTranslations("orders");

  const options = useMemo(
    () => customers.map((c) => ({ value: c.id, label: c.name })),
    [customers],
  );

  return (
    <Combobox
      options={options}
      value={selected ?? ""}
      onChange={(v) =>
        // Deliberately drops the list params of whichever customer was showing
        // before: a page or a sort belongs to the orders it was applied to, and
        // carrying `page=3` onto a customer with two orders lands on nothing.
        router.push(`/reports?tab=customers&customer=${v}`)
      }
      placeholder={placeholder}
      searchPlaceholder={t("searchCustomer")}
      emptyText={t("noMatches")}
      className="max-w-xs"
    />
  );
}
