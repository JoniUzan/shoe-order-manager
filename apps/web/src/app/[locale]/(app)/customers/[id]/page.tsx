import { prisma } from "@repo/db";
import { formatMoney } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
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
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { TableFrame } from "@/components/data-table/table-frame";
import { OrderStatusBadge, PaymentBadge } from "@/components/orders/badges";
import { DeleteCustomerButton } from "@/components/customers/delete-customer-button";
import { PageHeader } from "@/components/layout/page-header";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/session";

/** How much order history the detail card carries before deferring to /orders. */
const ORDER_PREVIEW = 10;

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "customers" });
  const td = await getTranslations({ locale, namespace: "dashboard" });

  const customer = await prisma.customer.findFirst({
    where: { id, ownerId: user.id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        // A card on a detail page is not a list screen: it shows the recent
        // history and hands the rest to /orders, which is the screen built for
        // searching and paging it. Unbounded, a long-standing customer rendered
        // every order they had ever placed.
        take: ORDER_PREVIEW,
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          statusCode: true,
          paymentStatus: true,
          totalAgorot: true,
        },
      },
      _count: { select: { orders: true } },
    },
  });
  if (!customer) notFound();

  const dateFmt = new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-US", {
    dateStyle: "medium",
  });

  const details: { label: string; value: string | null }[] = [
    { label: t("contactName"), value: customer.contactName },
    { label: t("phone"), value: customer.phone },
    { label: t("address"), value: customer.address },
    { label: t("notes"), value: customer.notes },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={customer.name}
        subtitle={customer.contactName ?? undefined}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/customers/${customer.id}/edit`}>
                <Pencil className="size-4" />
                {t("edit")}
              </Link>
            </Button>
            <DeleteCustomerButton id={customer.id} name={customer.name} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{t("details")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-3 text-sm">
              {details.map((d) => (
                <div key={d.label} className="flex flex-col gap-0.5">
                  <dt className="text-muted-foreground">{d.label}</dt>
                  <dd
                    dir={d.label === t("phone") ? "ltr" : undefined}
                    className="text-start whitespace-pre-wrap"
                  >
                    {d.value ?? "—"}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        {/* `min-w-0`: a grid item will not shrink below its content's
            min-content, and a table's min-content is the sum of its columns —
            so without this the card widened the whole column past the phone and
            the page scrolled sideways instead of the table. */}
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("orderHistory")}</CardTitle>
          </CardHeader>
          <CardContent>
            {customer.orders.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("noOrders")}
              </p>
            ) : (
              <TableFrame>
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>{td("colOrder")}</TableHead>
                      <TableHead>{td("colStatus")}</TableHead>
                      <TableHead className="text-end">
                        {td("colTotal")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.orders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/orders/${o.id}`}
                            className="hover:underline"
                          >
                            <bdi>#{o.orderNumber}</bdi>
                          </Link>
                          <span className="block text-xs font-normal text-muted-foreground">
                            {dateFmt.format(o.createdAt)}
                          </span>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableFrame>
            )}
            {customer._count.orders > customer.orders.length && (
              <Button asChild variant="ghost" size="sm" className="mt-3 w-full">
                {/* /orders searches by customer name, so this lands on the same
                    history with the tools to search and page it. */}
                <Link href={`/orders?q=${encodeURIComponent(customer.name)}`}>
                  {t("seeAllOrders", { count: customer._count.orders })}
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
