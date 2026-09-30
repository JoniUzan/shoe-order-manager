import { prisma } from "@repo/db";
import {
  buildOrderSummaryRows,
  buildWhatsAppUrl,
  computeOwedAgorot,
  formatMoney,
} from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { DeleteOrderButton } from "@/components/orders/delete-order-button";
import { OrderStatusBadge, PaymentBadge } from "@/components/orders/badges";
import { OrderItemsTable } from "@/components/orders/order-items-table";
import { OrderPdfMenu } from "@/components/orders/order-pdf-menu";
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

  // The packing card and the WhatsApp caption need every item, not the paged
  // table's slice.
  const allItems = (
    await prisma.orderItem.findMany({
      where: { orderId: order.id, order: { ownerId: user.id } },
      orderBy: { id: "asc" },
      include: { shoeModel: { select: { name: true, sku: true } } },
    })
  ).map((it) => ({
    ...it,
    name: it.shoeModel?.name ?? it.customDescription ?? "",
    sku: it.shoeModel?.sku ?? null,
  }));
  const packing =
    order.packs.length > 0 ? buildPackingSummary(allItems, order.packs) : null;

  const itemList = await listOrderItems(
    user.id,
    order.id,
    parseOrderItemListParams(sp),
  );

  const ts = await getTranslations({ locale, namespace: "share" });
  const tp = await getTranslations({ locale, namespace: "pdf" });

  // The Order summary's WhatsApp caption: the same rows as the PDF, as text.
  const owed = computeOwedAgorot(order.totalAgorot, order.depositAgorot);
  const summaryShareText = [
    user.businessName,
    `${ts("messageHeader")} — ${t("orderNumber", { number: order.orderNumber })}`,
    order.customer.name,
    "",
    ...buildOrderSummaryRows(allItems, order.packs).rows.map((row) => {
      const what = row.color ? `${row.name} — ${row.color}` : row.name;
      const sizes = row.sizes.map((s) => `${s.size}×${s.pairs}`).join(" · ");
      return `• ${what}: ${sizes} — ${formatMoney(row.totalAgorot, locale)}`;
    }),
    "",
    `${tp("total")}: ${formatMoney(order.totalAgorot, locale)}`,
    owed > 0 ? `${tp("remaining")}: ${formatMoney(owed, locale)}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n");

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
            <OrderPdfMenu
              orderId={order.id}
              orderNumber={order.orderNumber}
              summaryShareText={summaryShareText}
              customerWhatsAppUrl={buildWhatsAppUrl(
                order.customer.phone,
                summaryShareText,
              )}
            />
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

      <div className="grid items-start gap-6 sm:grid-cols-2">
        {(order.notes || order.factoryNote) && (
          <div className="flex flex-col gap-6">
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
            {order.factoryNote && (
              <Card>
                <CardHeader className="flex flex-row items-baseline justify-between gap-3">
                  <CardTitle>{t("factoryNote")}</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {t("factoryNoteHint")}
                  </span>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{order.factoryNote}</p>
                </CardContent>
              </Card>
            )}
          </div>
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
