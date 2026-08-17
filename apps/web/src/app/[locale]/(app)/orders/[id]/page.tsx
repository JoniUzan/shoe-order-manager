import { prisma } from "@repo/db";
import { formatMoney, formatSize } from "@repo/domain";
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
import { Pencil, Share2 } from "lucide-react";

import { TableFrame } from "@/components/data-table/table-frame";
import { DeleteOrderButton } from "@/components/orders/delete-order-button";
import { OrderStatusBadge, PaymentBadge } from "@/components/orders/badges";
import { OrderStatusToggle } from "@/components/orders/order-status-toggle";
import { PaymentControls } from "@/components/orders/payment-controls";
import { PageHeader } from "@/components/layout/page-header";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/session";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "orders" });

  const order = await prisma.order.findFirst({
    where: { id, ownerId: user.id },
    include: {
      customer: true,
      items: {
        include: { shoeModel: { select: { name: true, sizeFormat: true } } },
        orderBy: { id: "asc" },
      },
      payments: {
        orderBy: { paidAt: "desc" },
        select: { id: true, amountAgorot: true, paidAt: true, note: true },
      },
    },
  });
  if (!order) notFound();

  const ts = await getTranslations({ locale, namespace: "share" });

  const dateFmt = new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-US", {
    dateStyle: "long",
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("orderNumber", { number: order.orderNumber })}
        subtitle={dateFmt.format(order.createdAt)}
        action={
          <div className="flex flex-wrap gap-2">
            <OrderStatusToggle id={order.id} statusCode={order.statusCode} />
            <Button asChild variant="outline" size="sm">
              <Link href={`/print/orders/${order.id}`}>
                <Share2 className="size-4" />
                {ts("openInvoice")}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/orders/${order.id}/edit`}>
                <Pencil className="size-4" />
                {t("edit")}
              </Link>
            </Button>
            <DeleteOrderButton id={order.id} orderNumber={order.orderNumber} />
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/customers/${order.customerId}`}
          className="font-medium hover:underline"
        >
          {order.customer.name}
        </Link>
        <OrderStatusBadge code={order.statusCode} />
        <PaymentBadge status={order.paymentStatus} />
      </div>

      <TableFrame>
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead>{t("items")}</TableHead>
              <TableHead>{t("size")}</TableHead>
              <TableHead>{t("color")}</TableHead>
              <TableHead className="text-center">{t("quantity")}</TableHead>
              <TableHead className="text-end">{t("unitPrice")}</TableHead>
              <TableHead className="text-end">{t("lineTotal")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {item.shoeModel?.name ?? item.customDescription}
                </TableCell>
                <TableCell>
                  {formatSize(item.size, item.shoeModel?.sizeFormat)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.color ?? "—"}
                </TableCell>
                <TableCell className="text-center tabular-nums">
                  {item.quantity}
                </TableCell>
                <TableCell className="text-end tabular-nums">
                  {formatMoney(item.unitPriceAgorot, locale)}
                </TableCell>
                <TableCell className="text-end tabular-nums">
                  {formatMoney(item.unitPriceAgorot * item.quantity, locale)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableFrame>

      <div className="grid gap-6 sm:grid-cols-2">
        {order.notes && (
          <Card>
            <CardHeader>
              <CardTitle>{t("notes")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
            </CardContent>
          </Card>
        )}
        <div className="sm:col-start-2">
          <PaymentControls
            orderId={order.id}
            totalAgorot={order.totalAgorot}
            paidAgorot={order.depositAgorot}
            payments={order.payments}
          />
        </div>
      </div>
    </div>
  );
}
