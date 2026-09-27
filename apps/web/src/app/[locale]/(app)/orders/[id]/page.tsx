import { prisma } from "@repo/db";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Pencil, Share2 } from "lucide-react";

import { DeleteOrderButton } from "@/components/orders/delete-order-button";
import { OrderStatusBadge, PaymentBadge } from "@/components/orders/badges";
import { OrderItemsTable } from "@/components/orders/order-items-table";
import { OrderStatusToggle } from "@/components/orders/order-status-toggle";
import { PackingCard } from "@/components/orders/packing-card";
import { PaymentControls } from "@/components/orders/payment-controls";
import { PageHeader } from "@/components/layout/page-header";
import { Link } from "@/i18n/navigation";
import type { RawSearchParams } from "@/lib/list-params";
import {
  listOrderItems,
  parseOrderItemListParams,
} from "@/lib/order-items-query";
import { buildPackingSummary } from "@/lib/packing";
import { requireUser } from "@/lib/session";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { locale, id } = await params;
  const sp = await searchParams;
  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "orders" });

  const order = await prisma.order.findFirst({
    where: { id, ownerId: user.id },
    include: {
      customer: true,
      payments: {
        orderBy: { paidAt: "desc" },
        select: { id: true, amountAgorot: true, paidAt: true, note: true },
      },
      packs: {
        orderBy: { id: "asc" },
        select: { id: true, packName: true, curve: true, count: true },
      },
    },
  });
  if (!order) notFound();

  // The packing card needs every item, not the paged table's slice — and only
  // exists at all when the order has a pack, so an order without one costs
  // nothing extra.
  const packing =
    order.packs.length > 0
      ? buildPackingSummary(
          (
            await prisma.orderItem.findMany({
              where: { orderId: order.id, order: { ownerId: user.id } },
              orderBy: { id: "asc" },
              include: { shoeModel: { select: { name: true } } },
            })
          ).map((it) => ({
            ...it,
            name: it.shoeModel?.name ?? it.customDescription ?? "",
          })),
          order.packs,
        )
      : null;

  const itemList = await listOrderItems(
    user.id,
    order.id,
    parseOrderItemListParams(sp),
  );

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

      {packing && <PackingCard summary={packing} locale={locale} />}

      <OrderItemsTable
        rows={itemList.rows}
        total={itemList.total}
        totalUnfiltered={itemList.totalUnfiltered}
        pageCount={itemList.pageCount}
        params={itemList.params}
      />

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
