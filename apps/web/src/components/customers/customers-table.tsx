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
import type { ColumnDef } from "@tanstack/react-table";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import { DataTable } from "@/components/data-table/data-table";
import { DetailRow } from "@/components/data-table/detail-row";
import { SortHeader } from "@/components/data-table/sort-header";
import { useListParams } from "@/components/data-table/use-list-params";
import { CustomerRowActions } from "@/components/customers/customer-row-actions";
import { Link } from "@/i18n/navigation";
import {
  CUSTOMER_LIST_DEFAULTS,
  customerListToQuery,
  type CustomerListParams,
  type CustomerRow,
  type CustomerSort,
} from "@/lib/customers-query";

/**
 * The customers list. Like the orders table it only renders: search, filter,
 * sort and paging are URL state resolved on the server.
 */

/** Which direction a column should take when you first sort by it. */
const FIRST_DIR: Record<CustomerSort, "asc" | "desc"> = {
  name: "asc",
  ordersCount: "desc",
  createdAt: "desc",
};

export function CustomersTable({
  rows,
  total,
  pageCount,
  params,
}: {
  rows: CustomerRow[];
  total: number;
  pageCount: number;
  params: CustomerListParams;
}) {
  const t = useTranslations("customers");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isRtl = locale === "he";

  const { setParams, isPending, startTransition, search, setSearch } =
    useListParams(params, customerListToQuery);

  const [active, setActive] = useState<CustomerRow | null>(null);

  const sortBy = useCallback(
    (key: CustomerSort) => {
      setParams(
        params.sort === key
          ? { dir: params.dir === "asc" ? "desc" : "asc" }
          : { sort: key, dir: FIRST_DIR[key] },
      );
    },
    [params.sort, params.dir, setParams],
  );

  const columns = useMemo<ColumnDef<CustomerRow>[]>(
    () => [
      {
        accessorKey: "name",
        enableHiding: false,
        header: () => (
          <SortHeader
            label={t("name")}
            sortKey="name"
            active={params.sort === "name"}
            dir={params.dir}
            onSort={sortBy}
          />
        ),
        cell: ({ row }) => (
          <Link
            href={`/customers/${row.original.id}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: "contactName",
        // Dropped first on narrow screens: the phone scenes are "who is this"
        // and "what do they owe", and the store name already answers the first.
        meta: { cellClassName: "hidden md:table-cell" },
        header: t("contactName"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.contactName ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "phone",
        meta: { cellClassName: "hidden sm:table-cell" },
        header: t("phone"),
        cell: ({ row }) =>
          row.original.phone ? (
            // A phone number is always read left to right, even in Hebrew.
            <span dir="ltr" className="tabular-nums">
              {row.original.phone}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "ordersCount",
        header: () => (
          <SortHeader
            label={t("ordersCount")}
            sortKey="ordersCount"
            align="end"
            active={params.sort === "ordersCount"}
            dir={params.dir}
            onSort={sortBy}
          />
        ),
        cell: ({ row }) => (
          <div className="text-end tabular-nums text-muted-foreground">
            {row.original.ordersCount}
          </div>
        ),
      },
      {
        // Not sortable: the balance is summed in app code from each order and
        // never stored, so there is no column for the database to order by.
        accessorKey: "outstandingAgorot",
        header: () => <div className="text-end">{t("outstanding")}</div>,
        cell: ({ row }) => (
          <div className="text-end tabular-nums">
            {row.original.outstandingAgorot > 0 ? (
              <span className="font-medium">
                {formatMoney(row.original.outstandingAgorot, locale)}
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
            <CustomerRowActions id={row.original.id} name={row.original.name} />
          </div>
        ),
      },
    ],
    [locale, t, tc, params.sort, params.dir, sortBy],
  );

  return (
    <>
      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        total={total}
        pageCount={pageCount}
        params={params}
        defaultFilter={CUSTOMER_LIST_DEFAULTS.filter}
        setParams={setParams}
        startTransition={startTransition}
        isPending={isPending}
        search={search}
        setSearch={setSearch}
        filterTabs={[
          { value: "all", label: t("filterAll") },
          { value: "owing", label: t("filterOwing") },
          { value: "hasOrders", label: t("filterHasOrders") },
        ]}
        columnLabels={{
          contactName: t("contactName"),
          phone: t("phone"),
          ordersCount: t("ordersCount"),
          outstandingAgorot: t("outstanding"),
        }}
        strings={{
          searchPlaceholder: t("searchPlaceholder"),
          rowCount: t("rowCount", { count: total }),
          noResults: t("noResults"),
          noMatch: t("noMatch"),
        }}
        onRowClick={setActive}
      />

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
                <DrawerTitle>{active.name}</DrawerTitle>
                <DrawerDescription>{t("details")}</DrawerDescription>
              </DrawerHeader>
              <div className="flex flex-col gap-3 px-4 text-sm">
                <DetailRow
                  label={t("contactName")}
                  value={active.contactName ?? "—"}
                />
                <DetailRow label={t("phone")} value={active.phone ?? "—"} />
                <DetailRow label={t("address")} value={active.address ?? "—"} />
                <DetailRow
                  label={t("ordersCount")}
                  value={String(active.ordersCount)}
                />
                <DetailRow
                  label={t("outstanding")}
                  value={
                    active.outstandingAgorot > 0
                      ? formatMoney(active.outstandingAgorot, locale)
                      : "—"
                  }
                />
              </div>
              <DrawerFooter>
                <Button asChild>
                  <Link href={`/customers/${active.id}`}>
                    {t("openCustomer")}
                  </Link>
                </Button>
                <DrawerClose asChild>
                  <Button variant="outline">{t("close")}</Button>
                </DrawerClose>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
