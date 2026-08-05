import { prisma } from "@repo/db";
import { computeBalanceAgorot, formatMoney } from "@repo/domain";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { getTranslations } from "next-intl/server";

import { OrderStatusBadge, PaymentBadge } from "@/components/orders/badges";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/session";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "dashboard" });

  const [openOrders, recentOrders, totalOrders, customerCount] =
    await Promise.all([
      prisma.order.findMany({
        where: { ownerId: user.id, paymentStatus: { not: "paid" } },
        select: {
          totalAgorot: true,
          depositAgorot: true,
          customerId: true,
          customer: { select: { name: true } },
        },
      }),
      prisma.order.findMany({
        where: { ownerId: user.id },
        include: { customer: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.order.count({ where: { ownerId: user.id } }),
      prisma.customer.count({ where: { ownerId: user.id } }),
    ]);

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

        {/* Recent orders */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("recentOrders")}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("recentEmpty")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("colOrder")}</TableHead>
                    <TableHead>{t("colCustomer")}</TableHead>
                    <TableHead>{t("colStatus")}</TableHead>
                    <TableHead className="text-end">{t("colTotal")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/orders/${o.id}`}
                          className="hover:underline"
                        >
                          #{o.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{o.customer.name}</TableCell>
                      <TableCell>
                        <div className="flex gap-1.5">
                          <OrderStatusBadge code={o.statusCode} />
                          <PaymentBadge status={o.paymentStatus} />
                        </div>
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatMoney(o.totalAgorot, locale)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
