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
import { Pencil } from "lucide-react";

import { DeleteCustomerButton } from "@/components/customers/delete-customer-button";
import { PageHeader } from "@/components/layout/page-header";
import { OrdersTable } from "@/components/orders/orders-table";
import { Link } from "@/i18n/navigation";
import type { RawSearchParams } from "@/lib/list-params";
import { listOrders, parseOrderListParams } from "@/lib/orders-query";
import { requireUser } from "@/lib/session";

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { locale, id } = await params;
  const sp = await searchParams;
  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "customers" });

  const customer = await prisma.customer.findFirst({
    where: { id, ownerId: user.id },
    select: {
      id: true,
      name: true,
      contactName: true,
      phone: true,
      address: true,
      notes: true,
    },
  });
  if (!customer) notFound();

  // The history is the orders list, narrowed to this customer — same component,
  // same search, filters, sorting, paging and quick look as /orders.
  const list = await listOrders(user.id, parseOrderListParams(sp), {
    customerId: customer.id,
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
            without it the card widens the whole column past the phone and the
            page scrolls sideways instead of the table. */}
        <div className="flex min-w-0 flex-col gap-3 lg:col-span-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            {t("orderHistory")}
          </h3>
          {list.total === 0 && list.params.q === "" ? (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                {t("noOrders")}
              </CardContent>
            </Card>
          ) : (
            <OrdersTable
              rows={list.rows}
              total={list.total}
              pageCount={list.pageCount}
              params={list.params}
              scopedToCustomer
            />
          )}
        </div>
      </div>
    </div>
  );
}
