import { prisma } from "@repo/db";
import { computeBalanceAgorot, formatMoney } from "@repo/domain";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { getTranslations } from "next-intl/server";

import {
  SalesChart,
  type SalesPoint,
} from "@/components/dashboard/sales-chart";
import { OrdersTable } from "@/components/orders/orders-table";
import { Link } from "@/i18n/navigation";
import { listOrders, parseOrderListParams } from "@/lib/orders-query";
import { requireUser } from "@/lib/session";

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "dashboard" });
  const listParams = parseOrderListParams(await searchParams);

  // 90-day window for the sales chart. Bucketing happens in JS, not SQL —
  // the schema stays portable (no DB date functions) across Postgres hosts.
  const windowStart = new Date();
  windowStart.setHours(0, 0, 0, 0);
  windowStart.setDate(windowStart.getDate() - 89);

  const [
    openOrders,
    orderList,
    totalOrders,
    customerCount,
    windowOrders,
    windowPayments,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { ownerId: user.id, paymentStatus: { not: "paid" } },
      select: {
        totalAgorot: true,
        depositAgorot: true,
        customerId: true,
        customer: { select: { name: true } },
      },
    }),
    listOrders(user.id, listParams),
    prisma.order.count({ where: { ownerId: user.id } }),
    prisma.customer.count({ where: { ownerId: user.id } }),
    prisma.order.findMany({
      where: { ownerId: user.id, createdAt: { gte: windowStart } },
      select: { createdAt: true, totalAgorot: true },
    }),
    prisma.payment.findMany({
      where: { ownerId: user.id, paidAt: { gte: windowStart } },
      select: { paidAt: true, amountAgorot: true },
    }),
  ]);

  const dayKey = (d: Date) => {
    const local = new Date(d);
    local.setHours(0, 0, 0, 0);
    return local.toISOString().slice(0, 10);
  };

  const orderedByDay = new Map<string, number>();
  for (const o of windowOrders) {
    const k = dayKey(o.createdAt);
    orderedByDay.set(k, (orderedByDay.get(k) ?? 0) + o.totalAgorot);
  }
  const collectedByDay = new Map<string, number>();
  for (const p of windowPayments) {
    const k = dayKey(p.paidAt);
    collectedByDay.set(k, (collectedByDay.get(k) ?? 0) + p.amountAgorot);
  }

  // Every day in the window, zeros included — gaps would misdraw the area.
  const series: SalesPoint[] = Array.from({ length: 90 }, (_, i) => {
    const d = new Date(windowStart);
    d.setDate(d.getDate() + i);
    const k = dayKey(d);
    return {
      date: k,
      ordered: orderedByDay.get(k) ?? 0,
      collected: collectedByDay.get(k) ?? 0,
    };
  });

  // Aggregate outstanding balance per customer.
  const owedMap = new Map<string, { name: string; owed: number }>();
  let totalOutstanding = 0;
  for (const o of openOrders) {
    const balance = computeBalanceAgorot(o.totalAgorot, o.depositAgorot);
    if (balance <= 0) continue;
    totalOutstanding += balance;
    const entry = owedMap.get(o.customerId) ?? {
      name: o.customer.name,
      owed: 0,
    };
    entry.owed += balance;
    owedMap.set(o.customerId, entry);
  }
  const owedList = [...owedMap.entries()]
    .map(([customerId, v]) => ({ customerId, ...v }))
    .sort((a, b) => b.owed - a.owed)
    .slice(0, 8);

  const stats = [
    { label: t("statOutstanding"), value: formatMoney(totalOutstanding, locale) },
    { label: t("statOpenOrders"), value: String(openOrders.length) },
    { label: t("statTotalOrders"), value: String(totalOrders) },
    { label: t("statCustomers"), value: String(customerCount) },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <CardDescription>{s.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{s.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sales over time */}
        <div className="@container/card lg:col-span-2">
          <SalesChart data={series} />
        </div>

        {/* Who owes money */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{t("owedTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {owedList.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("owedEmpty")}
              </p>
            ) : (
              <ul className="flex flex-col divide-y">
                {owedList.map((c) => (
                  <li
                    key={c.customerId}
                    className="flex items-center justify-between gap-2 py-2.5 text-sm"
                  >
                    <Link
                      href={`/customers/${c.customerId}`}
                      className="truncate hover:underline"
                    >
                      {c.name}
                    </Link>
                    <span className="tabular-nums font-medium">
                      {formatMoney(c.owed, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

      </div>

      {/* All orders */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{t("recentOrders")}</h2>
        <OrdersTable
          rows={orderList.rows}
          total={orderList.total}
          pageCount={orderList.pageCount}
          params={orderList.params}
        />
      </section>
    </div>
  );
}
