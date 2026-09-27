import { prisma } from "@repo/db";
import {
  buildWhatsAppUrl,
  formatCurve,
  formatMoney,
  formatSize,
} from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CurveText } from "@/components/catalog/curve-text";
import { PrintButton } from "@/components/orders/print-button";
import { ShareOrderButton } from "@/components/orders/share-order-button";
import { Link } from "@/i18n/navigation";
import { buildPackingSummary, formatExtras } from "@/lib/packing";
import { requireUser } from "@/lib/session";

export default async function PrintOrderPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "orders" });
  const tp = await getTranslations({ locale, namespace: "payments" });
  const ta = await getTranslations({ locale, namespace: "app" });
  const tc = await getTranslations({ locale, namespace: "customers" });
  const ts = await getTranslations({ locale, namespace: "share" });

  const order = await prisma.order.findFirst({
    where: { id, ownerId: user.id },
    include: {
      customer: true,
      items: {
        include: { shoeModel: { select: { name: true, sizeFormat: true } } },
        orderBy: { id: "asc" },
      },
      packs: {
        orderBy: { id: "asc" },
        select: { id: true, packName: true, curve: true, count: true },
      },
    },
  });
  if (!order) notFound();

  const business = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      businessName: true,
      businessPhone: true,
      businessAddress: true,
      businessTaxId: true,
    },
  });

  // Only for an order with packs; without them the invoice is unchanged.
  const packing =
    order.packs.length > 0
      ? buildPackingSummary(
          order.items.map((it) => ({
            ...it,
            name: it.shoeModel?.name ?? it.customDescription ?? "",
          })),
          order.packs,
        )
      : null;

  const balance = order.totalAgorot - order.depositAgorot;
  const dateFmt = new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-US", {
    dateStyle: "long",
  });

  // Text summary used as the WhatsApp caption + desktop fallback link.
  const waMessage = [
    business.businessName,
    `${ts("messageHeader")} — ${t("orderNumber", { number: order.orderNumber })}`,
    order.customer.name,
    "",
    // What to pick comes first: the packs, then the loose pairs.
    ...(packing
      ? [
          ...packing.groups.flatMap((g) => [
            g.color ? `${g.name} — ${g.color}` : g.name,
            ...g.packs.map(
              (p) =>
                `📦 ${t("packLine", { count: p.count, name: p.name })} (${formatCurve(p.curve)})`,
            ),
            ...(g.extras.length > 0
              ? [
                  `${g.packs.length > 0 ? t("extraLine") : t("looseLine")} ${formatExtras(g.extras)}`,
                ]
              : []),
          ]),
          `${t("packsToPick", { count: packing.packsToPick })} · ${t("loosePairs", { count: packing.loosePairs })}`,
          "",
        ]
      : []),
    ...order.items.map((it) => {
      const name = it.shoeModel?.name ?? it.customDescription ?? "";
      const color = it.color ? ` ${it.color}` : "";
      return `• ${name} — ${t("size")} ${formatSize(it.size, it.shoeModel?.sizeFormat)}${color} × ${it.quantity} — ${formatMoney(
        it.unitPriceAgorot * it.quantity,
        locale,
      )}`;
    }),
    "",
    `${t("total")}: ${formatMoney(order.totalAgorot, locale)}`,
    balance > 0 ? `${tp("remaining")}: ${formatMoney(balance, locale)}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const waUrl = buildWhatsAppUrl(order.customer.phone, waMessage);

  return (
    <div className="min-h-dvh bg-white text-black">
      <div className="mx-auto max-w-3xl p-6 sm:p-8">
        {/* Actions (hidden when printing) */}
        <div className="mb-6 flex flex-wrap items-center gap-2 print:hidden">
          <ShareOrderButton
            targetId="order-invoice"
            fileName={`order-${order.orderNumber}.pdf`}
            shareTitle={t("orderNumber", { number: order.orderNumber })}
            shareText={waMessage}
            fallbackWaUrl={waUrl}
            label={ts("whatsapp")}
          />
          <PrintButton label={ts("print")} />
          <Button asChild variant="ghost" size="sm" className="ms-auto">
            <Link href={`/orders/${order.id}`}>
              <ArrowLeft className="size-4" />
              {ts("back")}
            </Link>
          </Button>
        </div>

        {/* Invoice (this node is what gets captured to PDF) */}
        <div id="order-invoice" className="bg-white p-2 text-black">
          <div className="mb-8 flex items-start justify-between border-b border-black/20 pb-4">
            {business.businessName ? (
              <div className="text-sm text-black/60">
                <h1 className="text-xl font-bold text-black">
                  {business.businessName}
                </h1>
                {business.businessAddress && <p>{business.businessAddress}</p>}
                {business.businessPhone && (
                  <p>
                    <span dir="ltr">{business.businessPhone}</span>
                  </p>
                )}
                {business.businessTaxId && (
                  <p>
                    {ts("taxId")}: {business.businessTaxId}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <h1 className="text-xl font-bold">{ta("name")}</h1>
                <p className="text-sm text-black/60">{ta("tagline")}</p>
              </div>
            )}
            <div className="text-end">
              <p className="text-lg font-semibold">
                {t("orderNumber", { number: order.orderNumber })}
              </p>
              <p className="text-sm text-black/60">
                {dateFmt.format(order.createdAt)}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <p className="mb-1 text-xs font-semibold tracking-wide text-black/50 uppercase">
              {tc("title")}
            </p>
            <p className="font-medium">{order.customer.name}</p>
            {order.customer.contactName && (
              <p className="text-sm">{order.customer.contactName}</p>
            )}
            {order.customer.phone && (
              <p className="text-sm" dir="ltr">
                {order.customer.phone}
              </p>
            )}
            {order.customer.address && (
              <p className="text-sm">{order.customer.address}</p>
            )}
          </div>

          {packing && (
            <div className="mb-6 text-sm">
              <p className="mb-2 text-xs font-semibold tracking-wide text-black/50 uppercase">
                {t("packing")}
              </p>
              <div className="flex flex-col gap-2">
                {packing.groups.map((group, i) => (
                  <div key={i}>
                    <p className="font-medium">
                      {group.color ? `${group.name} — ${group.color}` : group.name}
                    </p>
                    {group.packs.map((pack, k) => (
                      <p key={k} className="ps-3">
                        {t("packLine", { count: pack.count, name: pack.name })}{" "}
                        <span dir="ltr" className="text-black/60 tabular-nums">
                          (<CurveText curve={pack.curve} />)
                        </span>
                      </p>
                    ))}
                    {group.extras.length > 0 && (
                      <p className="ps-3 text-black/60">
                        {group.packs.length > 0 ? t("extraLine") : t("looseLine")}{" "}
                        <span dir="ltr" className="text-black tabular-nums">
                          <CurveText
                            curve={group.extras.map((e) => ({
                              size: e.size,
                              pairs: e.quantity,
                            }))}
                          />
                        </span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-2 border-t border-black/20 pt-2 font-semibold">
                {t("packsToPick", { count: packing.packsToPick })} ·{" "}
                {t("loosePairs", { count: packing.loosePairs })}
              </p>
            </div>
          )}

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y border-black/20">
                <th className="py-2 text-start font-semibold">{t("items")}</th>
                <th className="py-2 text-start font-semibold">{t("size")}</th>
                <th className="py-2 text-start font-semibold">{t("color")}</th>
                <th className="py-2 text-center font-semibold">
                  {t("quantity")}
                </th>
                <th className="py-2 text-end font-semibold">{t("unitPrice")}</th>
                <th className="py-2 text-end font-semibold">{t("lineTotal")}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it) => (
                <tr key={it.id} className="border-b border-black/10">
                  <td className="py-2">
                    {it.shoeModel?.name ?? it.customDescription}
                  </td>
                  <td className="py-2">
                    {formatSize(it.size, it.shoeModel?.sizeFormat)}
                  </td>
                  <td className="py-2">{it.color ?? "—"}</td>
                  <td className="py-2 text-center tabular-nums">
                    {it.quantity}
                  </td>
                  <td className="py-2 text-end tabular-nums">
                    {formatMoney(it.unitPriceAgorot, locale)}
                  </td>
                  <td className="py-2 text-end tabular-nums">
                    {formatMoney(it.unitPriceAgorot * it.quantity, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex flex-col items-end gap-1 text-sm">
            <div className="flex w-56 justify-between">
              <span className="text-black/60">{t("total")}</span>
              <span className="tabular-nums">
                {formatMoney(order.totalAgorot, locale)}
              </span>
            </div>
            {order.depositAgorot > 0 && (
              <div className="flex w-56 justify-between">
                <span className="text-black/60">{tp("paid")}</span>
                <span className="tabular-nums">
                  {formatMoney(order.depositAgorot, locale)}
                </span>
              </div>
            )}
            <div className="mt-1 flex w-56 justify-between border-t border-black/20 pt-1 text-base font-bold">
              <span>{tp("remaining")}</span>
              <span className="tabular-nums">
                {formatMoney(balance, locale)}
              </span>
            </div>
          </div>

          {order.notes && (
            <div className="mt-8 border-t border-black/20 pt-4 text-sm">
              <p className="mb-1 font-semibold">{t("notes")}</p>
              <p className="whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
