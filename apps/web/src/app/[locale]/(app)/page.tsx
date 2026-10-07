import { formatMoney } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { GlassCard } from "@repo/ui/components/glass-card";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { SalesChart } from "@/components/charts/sales-chart";
import { GetStarted } from "@/components/dashboard/get-started";
import { OpenOrders } from "@/components/dashboard/open-orders";
import { StatCards } from "@/components/dashboard/stat-cards";
import { PageHeader } from "@/components/layout/page-header";
import { avatarOf } from "@/components/ui/orb";
import { Link } from "@/i18n/navigation";
import { loadDashboard } from "@/lib/dashboard-query";
import { requireUser } from "@/lib/session";

/**
 * Today's to-do: what's owed, which Orders are still open, what came in this
 * week. Trends and analysis live in Reports; the small chart links there.
 */
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "dashboard" });
  const data = await loadDashboard(user.id);

  const today = new Date().toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Until the first Order there is nothing to count: no zero cards, no empty
  // chart. A new business gets the nudge to add its first Customer and model.
  if (data.orderCount === 0) {
    if (data.customerCount === 0 && data.modelCount === 0) {
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} subtitle={today} />

      <StatCards locale={locale} data={data} />

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="flex min-w-0 flex-col gap-3 px-5 pt-5 pb-4 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-[17px] font-semibold">{t("chartTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("chartDesc")}</p>
            </div>
            <Link
              href="/reports?tab=sales"
              className="text-sm font-medium text-primary hover:underline"
            >
              {t("chartFull")}
            </Link>
          </div>
          <SalesChart data={data.weeks} kind="bars" period="week" height={200} />
        </GlassCard>

        <GlassCard className="flex flex-col px-5 pt-5 pb-3 sm:px-6">
          <div className="flex items-baseline justify-between gap-3 pb-2">
            <h2 className="text-[17px] font-semibold">{t("owedTitle")}</h2>
            <Link href="/reports" className="text-sm text-muted-foreground hover:text-foreground">
              {t("owedAll")}
            </Link>
          </div>
          {data.owed.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("owedEmpty")}</p>
          ) : (
            <ul className="flex flex-col">
              {data.owed.map((c) => (
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
          )}
        </GlassCard>
      </div>

      <OpenOrders locale={locale} rows={data.openOrders} total={data.open.count} />
    </div>
  );
}
