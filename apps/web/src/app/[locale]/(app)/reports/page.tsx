import { prisma } from "@repo/db";
import {
  computeBalanceAgorot,
  formatMoney,
  formatMoneyCompact,
} from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { OrdersTable } from "@/components/orders/orders-table";
import { DebtChart } from "@/components/reports/debt-chart";
import { OwedTable } from "@/components/reports/owed-table";
import { RankBars } from "@/components/reports/rank-bars";
import { ReportCustomerSelect } from "@/components/reports/report-customer-select";
import { SalesTable } from "@/components/reports/sales-table";
import { SalesTrend } from "@/components/reports/sales-trend";
import { Link } from "@/i18n/navigation";
import { listOrders, parseOrderListParams } from "@/lib/orders-query";
import { listOwed, parseOwedListParams } from "@/lib/owed-query";
import type { RawSearchParams } from "@/lib/list-params";
import { listSales, parseSalesListParams } from "@/lib/sales-query";
import { loadSalesTrends } from "@/lib/sales-trends-query";
import { requireUser } from "@/lib/session";

/**
 * Three reports, one route, one table at a time — so each tab can own the
 * shared list params (`q`, `sort`, `page`, …) without colliding with the others.
 *
 * `tab` and `customer` are the page's own state and are *not* list params;
 * `useListParams` carries them through every navigation the table makes.
 */

type Tab = "owed" | "customers" | "sales";

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const tab: Tab = (["owed", "customers", "sales"] as const).includes(
    sp.tab as Tab,
  )
    ? (sp.tab as Tab)
    : "owed";
  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "reports" });

  const tabs: { key: Tab; label: string; href: string }[] = [
    { key: "owed", label: t("tabOwed"), href: "/reports" },
    {
      key: "customers",
      label: t("tabByCustomer"),
      href: "/reports?tab=customers",
    },
    { key: "sales", label: t("tabSales"), href: "/reports?tab=sales" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="flex gap-1 border-b">
        {tabs.map((tb) => (
          <Button
            key={tb.key}
            asChild
            variant="ghost"
            size="sm"
            className={
              tb.key === tab
                ? "rounded-none border-b-2 border-primary"
                : "rounded-none border-b-2 border-transparent text-muted-foreground"
            }
          >
            <Link href={tb.href}>{tb.label}</Link>
          </Button>
        ))}
      </div>

      {tab === "owed" && <OwedReport ownerId={user.id} sp={sp} t={t} />}
      {tab === "customers" && (
        <CustomersReport
          locale={locale}
          ownerId={user.id}
          customerId={typeof sp.customer === "string" ? sp.customer : undefined}
          sp={sp}
          t={t}
        />
      )}
      {tab === "sales" && (
        <SalesReport locale={locale} ownerId={user.id} sp={sp} t={t} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

async function OwedReport({
  ownerId,
  sp,
  t,
}: {
  ownerId: string;
  sp: RawSearchParams;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const list = await listOwed(ownerId, parseOwedListParams(sp));

  // "Nobody owes anything" is a different state from "nothing matched" — only
  // the first deserves the card. The table owns the second.
  if (list.total === 0 && list.params.q === "") {
    return <EmptyCard>{t("owedEmpty")}</EmptyCard>;
  }

  return (
    <OwedTable
      rows={list.rows}
      total={list.total}
      pageCount={list.pageCount}
      params={list.params}
      grandTotalAgorot={list.grandTotalAgorot}
    />
  );
}

async function CustomersReport({
  locale,
  ownerId,
  customerId,
  sp,
  t,
}: {
  locale: string;
  ownerId: string;
  customerId?: string;
  sp: RawSearchParams;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const customers = await prisma.customer.findMany({
    where: { ownerId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  // Scoped by id, so a customer who does not belong to this owner resolves to
  // nothing rather than to somebody else's orders.
  const customer = customerId
    ? await prisma.customer.findFirst({
        where: { id: customerId, ownerId },
        select: { id: true, name: true },
      })
    : null;

  const list = customer
    ? await listOrders(ownerId, parseOrderListParams(sp), {
        customerId: customer.id,
      })
    : null;

  // The tiles answer the report's question and must cover the customer's whole
  // history, not the page the table happens to be showing.
  const totals = customer
    ? await prisma.order.aggregate({
        where: { ownerId, customerId: customer.id },
        _count: true,
        _sum: { totalAgorot: true, depositAgorot: true },
      })
    : null;

  const ordered = totals?._sum.totalAgorot ?? 0;
  const owed = computeBalanceAgorot(ordered, totals?._sum.depositAgorot ?? 0);

  return (
    <div className="flex flex-col gap-4">
      <ReportCustomerSelect
        customers={customers}
        selected={customer?.id}
        placeholder={t("chooseCustomer")}
      />

      {!customer ? (
        <EmptyCard>{t("pickCustomerHint")}</EmptyCard>
      ) : totals?._count === 0 ? (
        <EmptyCard>{t("customerNoOrders")}</EmptyCard>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryTile
              label={t("summaryOrders")}
              value={String(totals?._count ?? 0)}
            />
            <SummaryTile
              label={t("summaryOrdered")}
              value={formatMoney(ordered, locale)}
            />
            <SummaryTile
              label={t("summaryOwed")}
              value={formatMoney(owed, locale)}
            />
          </div>
          {list && (
            <OrdersTable
              rows={list.rows}
              total={list.total}
              pageCount={list.pageCount}
              params={list.params}
              scopedToCustomer
            />
          )}
        </>
      )}
    </div>
  );
}

async function SalesReport({
  locale,
  ownerId,
  sp,
  t,
}: {
  locale: string;
  ownerId: string;
  sp: RawSearchParams;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const [list, trends] = await Promise.all([
    listSales(ownerId, parseSalesListParams(sp)),
    loadSalesTrends(ownerId),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <SalesTrend weeks={trends.weeks} />
      <div className="grid gap-4 lg:grid-cols-2">
        <RankBars
          title={t("topModelsTitle")}
          description={t("topModelsDesc")}
          empty={t("rankEmpty")}
          fill="bg-chart-1"
          rows={trends.topModels.map((m) => ({
            id: m.id,
            name: m.name,
            value: m.pairs,
            label: m.pairs,
          }))}
        />
        <RankBars
          title={t("topCustomersTitle")}
          description={t("topCustomersDesc")}
          empty={t("rankEmpty")}
          fill="bg-chart-5"
          rows={trends.topCustomers.map((c) => ({
            id: c.id,
            name: c.name,
            value: c.orderedAgorot,
            label: formatMoneyCompact(c.orderedAgorot, locale),
          }))}
        />
      </div>
      <DebtChart data={trends.debt} />
      <SalesTable
        rows={list.rows}
        total={list.total}
        pageCount={list.pageCount}
        params={list.params}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function EmptyCard({ children }: { children: ReactNode }) {
  return (
    <Card>
      {/* No vertical padding here: `Card` already carries `py-6`, and adding
          to it stacked two paddings into a card mostly made of nothing. */}
      <CardContent className="py-6 text-center text-sm text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-xl font-bold tabular-nums">{value}</span>
      </CardContent>
    </Card>
  );
}
