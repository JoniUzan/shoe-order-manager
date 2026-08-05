import { prisma } from "@repo/db";
import { computeBalanceAgorot, formatMoney } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { cn } from "@repo/ui/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { getTranslations } from "next-intl/server";
import { Package, Plus } from "lucide-react";

import { OrderStatusBadge, PaymentBadge } from "@/components/orders/badges";
import { PageHeader } from "@/components/layout/page-header";
import { Link } from "@/i18n/navigation";
import type { Prisma } from "@repo/db";
import { requireUser } from "@/lib/session";

const FILTERS = ["all", "open", "unpaid"] as const;
type Filter = (typeof FILTERS)[number];

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { locale } = await params;
  const { filter: rawFilter } = await searchParams;
  const filter: Filter = FILTERS.includes(rawFilter as Filter)
    ? (rawFilter as Filter)
    : "all";
  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "orders" });
  const td = await getTranslations({ locale, namespace: "dashboard" });

  const where: Prisma.OrderWhereInput = { ownerId: user.id };
  if (filter === "open") where.statusCode = "not_done";
  if (filter === "unpaid") where.paymentStatus = { not: "paid" };

  const orders = await prisma.order.findMany({
    where,
    include: { customer: { select: { name: true } } },
    orderBy: { orderNumber: "desc" },
  });

  const dateFmt = new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-US", {
    dateStyle: "medium",
  });

  const filterLabels: Record<Filter, string> = {
    all: t("filterAll"),
    open: t("filterOpen"),
    unpaid: t("filterUnpaid"),
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <Button asChild>
            <Link href="/orders/new">
              <Plus className="size-4" />
              {t("add")}
            </Link>
          </Button>
        }
      />

      <div className="flex gap-1">
        {FILTERS.map((f) => (
          <Button key={f} asChild variant={f === filter ? "secondary" : "ghost"} size="sm">
            <Link href={f === "all" ? "/orders" : `/orders?filter=${f}`}>
              {filterLabels[f]}
            </Link>
          </Button>
        ))}
      </div>

      {orders.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Package className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">{t("empty")}</p>
            <p className="text-sm text-muted-foreground">{t("emptyHint")}</p>
          </div>
          <Button asChild className="mt-2">
            <Link href="/orders/new">
              <Plus className="size-4" />
              {t("add")}
            </Link>
          </Button>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{td("colOrder")}</TableHead>
                <TableHead>{t("customer")}</TableHead>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="text-end">{t("total")}</TableHead>
                <TableHead className="text-end">{t("balance")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => {
                const balance = computeBalanceAgorot(
                  o.totalAgorot,
                  o.depositAgorot,
                );
                return (
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
                    <TableCell
                      className={cn(
                        "text-end tabular-nums",
                        balance > 0 && "font-medium",
                      )}
                    >
                      {balance > 0 ? formatMoney(balance, locale) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
