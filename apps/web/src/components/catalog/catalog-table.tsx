"use client";

import {
  curvePairs,
  formatMoney,
  parseCurve,
  parseSizes,
} from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
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
import { useCallback, useMemo, useState, type ReactNode } from "react";

import { ModelRowActions } from "@/components/catalog/model-row-actions";
import { CurveText } from "@/components/catalog/curve-text";
import { DataTable } from "@/components/data-table/data-table";
import { DetailRow } from "@/components/data-table/detail-row";
import { SortHeader } from "@/components/data-table/sort-header";
import { useListParams } from "@/components/data-table/use-list-params";
import { Link } from "@/i18n/navigation";
import {
  CATALOG_LIST_DEFAULTS,
  catalogListToQuery,
  type CatalogListParams,
  type CatalogRow,
  type CatalogSort,
} from "@/lib/catalog-query";

/**
 * The catalog list. Like the orders and customers tables it only renders:
 * search, filter, sort and paging are URL state resolved on the server.
 *
 * The quick look matters more here than on the other two lists: a model has no
 * detail page, so without it the description and the size run can only be read
 * by opening the edit form — which means the way to look at a model is to start
 * changing it. The drawer is the read; editing stays a deliberate second step.
 */

/** One label with a value too long to sit on the same line as it. */
function DetailBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

/** The stored size run, as the chips the catalog form edits it with. */
function SizeRun({ stored, empty }: { stored: string | null; empty: string }) {
  const run = parseSizes(stored);
  if (run.length === 0)
    return <span className="text-muted-foreground">{empty}</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {run.map((size) => (
        <span
          key={size}
          className="rounded-md bg-muted px-1.5 py-0.5 text-xs tabular-nums"
        >
          {size}
        </span>
      ))}
    </div>
  );
}

/** Each pack as one line: its name, pairs per pack and the per-size curve. */
function PackList({
  packs,
  empty,
  summary,
}: {
  packs: CatalogRow["packs"];
  empty: string;
  summary: (name: string, count: number) => string;
}) {
  if (packs.length === 0)
    return <span className="text-muted-foreground">{empty}</span>;
  return (
    <ul className="flex flex-col gap-1">
      {packs.map((pack) => {
        const curve = parseCurve(pack.curve);
        return (
          <li key={pack.name}>
            {summary(pack.name, curvePairs(curve))}{" "}
            <span dir="ltr" className="text-xs text-muted-foreground tabular-nums">
              (<CurveText curve={curve} separator=" " />)
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Which direction a column should take when you first sort by it. */
const FIRST_DIR: Record<CatalogSort, "asc" | "desc"> = {
  name: "asc",
  sku: "asc",
  price: "desc",
  orderLines: "desc",
};

export function CatalogTable({
  rows,
  total,
  pageCount,
  params,
}: {
  rows: CatalogRow[];
  total: number;
  pageCount: number;
  params: CatalogListParams;
}) {
  const t = useTranslations("catalog");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isRtl = locale === "he";

  const { setParams, isPending, startTransition, search, setSearch } =
    useListParams(params, catalogListToQuery);

  const [active, setActive] = useState<CatalogRow | null>(null);

  const sortBy = useCallback(
    (key: CatalogSort) => {
      setParams(
        params.sort === key
          ? { dir: params.dir === "asc" ? "desc" : "asc" }
          : { sort: key, dir: FIRST_DIR[key] },
      );
    },
    [params.sort, params.dir, setParams],
  );

  const columns = useMemo<ColumnDef<CatalogRow>[]>(
    () => [
      {
        accessorKey: "name",
        enableHiding: false,
        meta: { sortKey: "name" },
        header: () => (
          <SortHeader
            label={t("name")}
            sortKey="name"
            active={params.sort === "name"}
            dir={params.dir}
            onSort={sortBy}
          />
        ),
        // Not a link: the row opens the quick look, and a link in the first
        // cell would swallow that click and take you to the edit form — the
        // one thing looking at a model should not do.
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "sku",
        // Dropped first on narrow screens: a SKU is what you search by, not
        // what you scan by — the name already tells you which model this is.
        meta: { cellClassName: "hidden sm:table-cell", sortKey: "sku" },
        header: () => (
          <SortHeader
            label={t("sku")}
            sortKey="sku"
            active={params.sort === "sku"}
            dir={params.dir}
            onSort={sortBy}
          />
        ),
        cell: ({ row }) => (
          // A SKU is a code: read left to right even in Hebrew.
          <span dir="ltr" className="text-start text-muted-foreground">
            {row.original.sku ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "defaultPriceAgorot",
        meta: { sortKey: "price" },
        header: () => (
          <SortHeader
            label={t("price")}
            sortKey="price"
            align="end"
            active={params.sort === "price"}
            dir={params.dir}
            onSort={sortBy}
          />
        ),
        cell: ({ row }) => (
          <div className="text-end tabular-nums">
            {row.original.defaultPriceAgorot != null ? (
              formatMoney(row.original.defaultPriceAgorot, locale)
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "orderLines",
        meta: { cellClassName: "hidden md:table-cell", sortKey: "orderLines" },
        header: () => (
          <SortHeader
            label={t("orderLines")}
            sortKey="orderLines"
            align="end"
            active={params.sort === "orderLines"}
            dir={params.dir}
            onSort={sortBy}
          />
        ),
        cell: ({ row }) => (
          <div className="text-end tabular-nums text-muted-foreground">
            {row.original.orderLines}
          </div>
        ),
      },
      {
        accessorKey: "isActive",
        header: t("active"),
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "success" : "secondary"}>
            {row.original.isActive ? t("active") : t("inactive")}
          </Badge>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        header: () => <span className="sr-only">{tc("actions")}</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <ModelRowActions id={row.original.id} name={row.original.name} />
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
        defaultFilter={CATALOG_LIST_DEFAULTS.filter}
        setParams={setParams}
        startTransition={startTransition}
        isPending={isPending}
        search={search}
        setSearch={setSearch}
        filterTabs={[
          { value: "all", label: t("filterAll") },
          { value: "active", label: t("filterActive") },
          { value: "inactive", label: t("filterInactive") },
        ]}
        columnLabels={{
          sku: t("sku"),
          defaultPriceAgorot: t("price"),
          orderLines: t("orderLines"),
          isActive: t("active"),
        }}
        strings={{
          searchPlaceholder: t("searchPlaceholder"),
          rowCount: t("rowCount", { count: total }),
          noResults: t("noResults"),
          noMatch: t("noMatch"),
        }}
        onRowClick={setActive}
        isRowActive={(row) => row.id === active?.id}
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
              <div className="flex flex-col gap-3 overflow-y-auto px-4 text-sm">
                <DetailRow label={t("sku")} value={active.sku ?? "—"} />
                <DetailRow
                  label={t("price")}
                  value={
                    active.defaultPriceAgorot != null
                      ? formatMoney(active.defaultPriceAgorot, locale)
                      : "—"
                  }
                />
                <DetailRow
                  label={t("status")}
                  value={active.isActive ? t("active") : t("inactive")}
                />
                <DetailRow
                  label={t("sizeFormat")}
                  value={t(`sizeFormat_${active.sizeFormat}`)}
                />
                <DetailRow
                  label={t("orderLines")}
                  value={String(active.orderLines)}
                />
                <DetailRow
                  label={t("added")}
                  value={new Date(active.createdAt).toLocaleDateString(locale, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                />
                <DetailBlock label={t("sizes")}>
                  <SizeRun stored={active.sizes} empty={t("sizesEmpty")} />
                </DetailBlock>
                <DetailBlock label={t("packs")}>
                  <PackList
                    packs={active.packs}
                    empty={t("packsEmpty")}
                    summary={(name, count) => t("packSummary", { name, count })}
                  />
                </DetailBlock>
                <DetailBlock label={t("description")}>
                  {active.description ? (
                    // Kept as typed — a description is often a short list.
                    <p className="whitespace-pre-wrap">{active.description}</p>
                  ) : (
                    <span className="text-muted-foreground">
                      {t("noDescription")}
                    </span>
                  )}
                </DetailBlock>
              </div>
              <DrawerFooter>
                <Button asChild>
                  <Link href={`/catalog/${active.id}/edit`}>{t("edit")}</Link>
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
