import { prisma } from "@repo/db";
import { computeBalanceAgorot, formatMoney } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { getTranslations } from "next-intl/server";
import { Plus, Users } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/session";

export default async function CustomersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "customers" });

  const customers = await prisma.customer.findMany({
    where: { ownerId: user.id },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { orders: true } },
      orders: {
        where: { paymentStatus: { not: "paid" } },
        select: { totalAgorot: true, depositAgorot: true },
      },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <Button asChild>
            <Link href="/customers/new">
              <Plus className="size-4" />
              {t("add")}
            </Link>
          </Button>
        }
      />

      {customers.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Users className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">{t("empty")}</p>
            <p className="text-sm text-muted-foreground">{t("emptyHint")}</p>
          </div>
          <Button asChild className="mt-2">
            <Link href="/customers/new">
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
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("contactName")}</TableHead>
                <TableHead>{t("phone")}</TableHead>
                <TableHead className="text-center">{t("ordersCount")}</TableHead>
                <TableHead className="text-end">{t("outstanding")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => {
                const outstanding = c.orders.reduce(
                  (sum, o) =>
                    sum + computeBalanceAgorot(o.totalAgorot, o.depositAgorot),
                  0,
                );
                return (
                  <TableRow key={c.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <Link
                        href={`/customers/${c.id}`}
                        className="hover:underline"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.contactName ?? "—"}
                    </TableCell>
                    <TableCell dir="ltr" className="text-start tabular-nums">
                      {c.phone ?? "—"}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {c._count.orders}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {outstanding > 0 ? formatMoney(outstanding, locale) : "—"}
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
