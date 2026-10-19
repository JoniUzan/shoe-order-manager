import { formatMoney } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { SalesChart } from "@/components/charts/sales-chart";
import {
  ChartCard,
  OrdersSectionTitle,
  OwedCard,
} from "@/components/dashboard/dashboard-cards";
import { GetStarted } from "@/components/dashboard/get-started";
import { StatCards } from "@/components/dashboard/stat-cards";
import { PageHeader } from "@/components/layout/page-header";
import { OrdersTable } from "@/components/orders/orders-table";
import { ChartSkeleton } from "@/components/skeletons/chart-skeleton";
import { ListSkeleton } from "@/components/skeletons/list-skeleton";
import { OrdersTableSkeleton } from "@/components/skeletons/list-skeletons";
import { StatCardsSkeleton } from "@/components/skeletons/stat-cards-skeleton";
import { avatarOf } from "@/components/ui/orb";
import { Link } from "@/i18n/navigation";
import {
  DASHBOARD_WEEKS,
  loadDashboardCounts,
  loadDashboardStats,
  loadDashboardWeeks,
  loadOwed,
  OWED_SHOWN,
} from "@/lib/dashboard-query";
import type { RawSearchParams } from "@/lib/list-params";
import {
  listOrders,
  parseDashboardOrderParams,
  type OrderListParams,
} from "@/lib/orders-query";
import { requireUser } from "@/lib/session";

/**
 * Today's to-do: what's owed, which Orders are still open, what came in this
 * week. Trends and analysis live in Reports; the small chart links there.
 *
 * The counts come first, since they decide which page this is; then each
 * section streams on its own (ADR 0012).
 */
export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { locale } = await params;
  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "dashboard" });
  const counts = await loadDashboardCounts(user.id);

  // Until the first Order there is nothing to count: no zero cards, no empty
  // chart. A new business gets the nudge to add its first Customer and model.
  if (counts.orderCount === 0) {
    if (counts.customerCount === 0 && counts.modelCount === 0) {
      return (
        <GetStarted locale={locale} name={user.name ?? ""} avatar={avatarOf(user)} />
      );
    }
    return (
      <Card className="items-center gap-3 px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">{t("recentEmpty")}</p>
        <Button asChild>
          <Link href="/orders/new">
            <Plus />
            {t("newOrder")}
          </Link>
        </Button>
      </Card>
    );
  }

  const orderParams = parseDashboardOrderParams(await searchParams);
  const today = new Date().toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} subtitle={today} />

      <Suspense fallback={<StatCardsSkeleton />}>
        <Stats locale={locale} ownerId={user.id} />
      </Suspense>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard>
          <Suspense fallback={<ChartSkeleton groups={DASHBOARD_WEEKS} height={200} />}>
            <WeeksChart ownerId={user.id} />
          </Suspense>
        </ChartCard>
        <OwedCard>
          <Suspense fallback={<ListSkeleton rows={OWED_SHOWN} />}>
            <Owed locale={locale} ownerId={user.id} />
          </Suspense>
        </OwedCard>
      </div>

      {/* The Orders list, opening on the open ones. A solid table, not glass. */}
      <section className="flex flex-col gap-4">
        <OrdersSectionTitle />
        <Suspense fallback={<OrdersTableSkeleton params={orderParams} onDashboard />}>
          <DashboardOrders ownerId={user.id} orderParams={orderParams} />
        </Suspense>
      </section>
    </div>
  );
}

async function Stats({ locale, ownerId }: { locale: string; ownerId: string }) {
  return <StatCards locale={locale} data={await loadDashboardStats(ownerId)} />;
}

async function WeeksChart({ ownerId }: { ownerId: string }) {
  const weeks = await loadDashboardWeeks(ownerId);
  return <SalesChart data={weeks} kind="bars" period="week" height={200} />;
}

async function Owed({ locale, ownerId }: { locale: string; ownerId: string }) {
  const t = await getTranslations({ locale, namespace: "dashboard" });
  const owed = await loadOwed(ownerId);

  if (owed.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{t("owedEmpty")}</p>;
  }
  return (
    <ul className="flex flex-col">
      {owed.map((c) => (
        <li key={c.customerId} className="border-t border-(--hairline) first:border-t-0">
          <Link
            href={`/customers/${c.customerId}`}
            className="-mx-2.5 flex h-11 items-center justify-between gap-3 rounded-xl px-2.5 transition-colors duration-150 pointer-fine:hover:bg-(--glass-track)"
          >
            <span className="truncate">{c.name}</span>
            <span className="font-semibold tabular-nums">
              {formatMoney(c.owedAgorot, locale)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function DashboardOrders({
  ownerId,
  orderParams,
}: {
  ownerId: string;
  orderParams: OrderListParams;
}) {
  const list = await listOrders(ownerId, orderParams);
  return (
    <OrdersTable
      rows={list.rows}
      total={list.total}
      pageCount={list.pageCount}
      params={list.params}
      onDashboard
    />
  );
}
