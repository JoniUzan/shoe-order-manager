import { prisma } from "@repo/db";
import { computeBalanceAgorot, formatMoney } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { TableFrame } from "@/components/data-table/table-frame";
import { OrderStatusBadge, PaymentBadge } from "@/components/orders/badges";
import { PageHeader } from "@/components/layout/page-header";
import { ReportCustomerSelect } from "@/components/reports/report-customer-select";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/session";

type Tab = "owed" | "customers" | "sales";
type Period = "month" | "week";

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; customer?: string; period?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const tab: Tab = (["owed", "customers", "sales"] as const).includes(
    sp.tab as Tab,
  )
    ? (sp.tab as Tab)
    : "owed";
  const period: Period = sp.period === "week" ? "week" : "month";
  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "reports" });
  const to = await getTranslations({ locale, namespace: "orders" });

  const dateFmt = new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-US", {
    dateStyle: "medium",
  });

  const tabs: { key: Tab; label: string; href: string }[] = [
    { key: "owed", label: t("tabOwed"), href: "/reports" },
    { key: "customers", label: t("tabByCustomer"), href: "/reports?tab=customers" },
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

      {tab === "owed" && <OwedReport locale={locale} ownerId={user.id} t={t} />}
      {tab === "customers" && (
        <CustomersReport
          locale={locale}
          ownerId={user.id}
          customerId={sp.customer}
          t={t}
          to={to}
          dateFmt={dateFmt}
        />
      )}
      {tab === "sales" && (
        <SalesReport
          locale={locale}
          ownerId={user.id}
          period={period}
          t={t}
          dateFmt={dateFmt}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

async function OwedReport({
  locale,
  ownerId,
  t,
}: {
  locale: string;
  ownerId: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const openOrders = await prisma.order.findMany({
    where: { ownerId, paymentStatus: { not: "paid" } },
    select: {
      customerId: true,
      totalAgorot: true,
      depositAgorot: true,
      customer: { select: { name: true } },
    },
  });

  const map = new Map<string, { name: string; owed: number; count: number }>();
  let total = 0;
  for (const o of openOrders) {
    const balance = computeBalanceAgorot(o.totalAgorot, o.depositAgorot);
    if (balance <= 0) continue;
    total += balance;
    const e = map.get(o.customerId) ?? { name: o.customer.name, owed: 0, count: 0 };
    e.owed += balance;
    e.count += 1;
    map.set(o.customerId, e);
  }
  const rows = [...map.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.owed - a.owed);

  if (rows.length === 0) {
    return <EmptyCard>{t("owedEmpty")}</EmptyCard>;
  }

  return (
    <TableFrame>
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead>{t("colCustomer")}</TableHead>
            <TableHead className="text-center">{t("colOpenOrders")}</TableHead>
            <TableHead className="text-end">{t("colOwed")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">
                <Link href={`/customers/${r.id}`} className="hover:underline">
                  {r.name}
                </Link>
              </TableCell>
              <TableCell className="text-center tabular-nums">{r.count}</TableCell>
              <TableCell className="text-end font-medium tabular-nums">
                {formatMoney(r.owed, locale)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        {/* A summary of the table, not a row in it — so `tfoot`, which also
            means a screen reader announces it as the summary it is. */}
        <TableFooter>
          <TableRow>
            <TableHead scope="row">{t("owedTotal")}</TableHead>
            <TableCell />
            <TableCell className="text-end font-bold tabular-nums">
              {formatMoney(total, locale)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </TableFrame>
  );
}

async function CustomersReport({
  locale,
  ownerId,
  customerId,
  t,
  to,
  dateFmt,
}: {
  locale: string;
  ownerId: string;
  customerId?: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
  to: Awaited<ReturnType<typeof getTranslations>>;
  dateFmt: Intl.DateTimeFormat;
}) {
  const customers = await prisma.customer.findMany({
    where: { ownerId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const customer = customerId
    ? await prisma.customer.findFirst({
        where: { id: customerId, ownerId },
        include: { orders: { orderBy: { createdAt: "desc" } } },
      })
    : null;

  const ordered = customer?.orders.reduce((s, o) => s + o.totalAgorot, 0) ?? 0;
  const owed =
    customer?.orders.reduce(
      (s, o) => s + computeBalanceAgorot(o.totalAgorot, o.depositAgorot),
      0,
    ) ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <ReportCustomerSelect
        customers={customers}
        selected={customerId}
        placeholder={t("chooseCustomer")}
      />

      {!customer ? (
        <EmptyCard>{t("pickCustomerHint")}</EmptyCard>
      ) : customer.orders.length === 0 ? (
        <EmptyCard>{t("customerNoOrders")}</EmptyCard>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryTile label={t("summaryOrders")} value={String(customer.orders.length)} />
            <SummaryTile label={t("summaryOrdered")} value={formatMoney(ordered, locale)} />
            <SummaryTile label={t("summaryOwed")} value={formatMoney(owed, locale)} />
          </div>
          <TableFrame>
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>{t("colOrder")}</TableHead>
                  <TableHead>{to("date")}</TableHead>
                  <TableHead>{to("status")}</TableHead>
                  <TableHead className="text-end">{to("total")}</TableHead>
                  <TableHead className="text-end">{to("balance")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.orders.map((o) => {
                  const balance = computeBalanceAgorot(o.totalAgorot, o.depositAgorot);
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">
                        <Link href={`/orders/${o.id}`} className="hover:underline">
                          <bdi>#{o.orderNumber}</bdi>
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {dateFmt.format(o.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          <OrderStatusBadge code={o.statusCode} />
                          <PaymentBadge status={o.paymentStatus} />
                        </div>
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatMoney(o.totalAgorot, locale)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {balance > 0 ? formatMoney(balance, locale) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableFrame>
        </>
      )}
    </div>
  );
}

async function SalesReport({
  locale,
  ownerId,
  period,
  t,
  dateFmt,
}: {
  locale: string;
  ownerId: string;
  period: Period;
  t: Awaited<ReturnType<typeof getTranslations>>;
  dateFmt: Intl.DateTimeFormat;
}) {
  const orders = await prisma.order.findMany({
    where: { ownerId },
    select: { createdAt: true, totalAgorot: true, depositAgorot: true },
  });

  const monthFmt = new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-US", {
    year: "numeric",
    month: "long",
  });

  const map = new Map<
    string,
    { start: Date; count: number; gross: number; collected: number }
  >();
  for (const o of orders) {
    let key: string;
    let start: Date;
    if (period === "month") {
      const y = o.createdAt.getFullYear();
      const m = o.createdAt.getMonth();
      key = `${y}-${String(m + 1).padStart(2, "0")}`;
      start = new Date(y, m, 1);
    } else {
      const d = new Date(o.createdAt);
      const dow = (d.getDay() + 6) % 7; // Monday = 0
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - dow);
      key = d.toISOString().slice(0, 10);
      start = d;
    }
    const e = map.get(key) ?? { start, count: 0, gross: 0, collected: 0 };
    e.count += 1;
    e.gross += o.totalAgorot;
    e.collected += o.depositAgorot;
    map.set(key, e);
  }
  const rows = [...map.values()].sort(
    (a, b) => b.start.getTime() - a.start.getTime(),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1">
        {(["month", "week"] as const).map((p) => (
          <Button
            key={p}
            asChild
            variant={p === period ? "secondary" : "ghost"}
            size="sm"
          >
            <Link href={`/reports?tab=sales&period=${p}`}>
              {p === "month" ? t("monthly") : t("weekly")}
            </Link>
          </Button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyCard>{t("salesEmpty")}</EmptyCard>
      ) : (
        <TableFrame>
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>{t("colPeriod")}</TableHead>
                <TableHead className="text-center">{t("colOrders")}</TableHead>
                <TableHead className="text-end">{t("colGross")}</TableHead>
                <TableHead className="text-end">{t("colCollected")}</TableHead>
                <TableHead className="text-end">{t("colOutstanding")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.start.toISOString()}>
                  <TableCell className="font-medium">
                    {period === "month"
                      ? monthFmt.format(r.start)
                      : t("weekOf", { date: dateFmt.format(r.start) })}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {r.count}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {formatMoney(r.gross, locale)}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {formatMoney(r.collected, locale)}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {formatMoney(r.gross - r.collected, locale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableFrame>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function EmptyCard({ children }: { children: ReactNode }) {
  return (
    <Card>
      <CardContent className="py-12 text-center text-sm text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-4">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-xl font-bold tabular-nums">{value}</span>
      </CardContent>
    </Card>
  );
}
