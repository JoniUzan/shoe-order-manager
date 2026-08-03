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
        select: { totalAgorot: true, depositAgorot: true },
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

  const totalOutstanding = openOrders.reduce(
    (sum, o) => sum + computeBalanceAgorot(o.totalAgorot, o.depositAgorot),
    0,
  );

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

      {/* Recent orders table */}
      <Card>
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
                      #{o.orderNumber}
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
  );
}
