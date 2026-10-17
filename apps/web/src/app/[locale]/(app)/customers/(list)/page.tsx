import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { getTranslations } from "next-intl/server";
import { Plus, Users } from "lucide-react";
import { Suspense } from "react";

import { CustomersTable } from "@/components/customers/customers-table";
import { ListHeader } from "@/components/layout/list-header";
import { CustomersTableSkeleton } from "@/components/skeletons/list-skeletons";
import { OrbField } from "@/components/ui/orb";
import { Link } from "@/i18n/navigation";
import {
  listCustomers,
  parseCustomerListParams,
  type CustomerListParams,
} from "@/lib/customers-query";
import { requireUser } from "@/lib/session";

export default async function CustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "customers" });
  const listParams = parseCustomerListParams(await searchParams);

  return (
    <div className="flex flex-col gap-6">
      <ListHeader
        title={t("title")}
        subtitle={t("subtitle")}
        addHref="/customers/new"
        addLabel={t("add")}
      />
      {/* Not keyed by the params: paging keeps the old rows, dimmed (ADR 0012). */}
      <Suspense fallback={<CustomersTableSkeleton params={listParams} />}>
        <CustomersList locale={locale} listParams={listParams} />
      </Suspense>
    </div>
  );
}

async function CustomersList({
  locale,
  listParams,
}: {
  locale: string;
  listParams: CustomerListParams;
}) {
  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "customers" });
  const list = await listCustomers(user.id, listParams);

  // "Nothing here yet" is a different state from "nothing matched" — only the
  // first one deserves the onboarding card. The table owns the second.
  const isFirstRun =
    list.total === 0 && listParams.q === "" && listParams.filter === "all";

  if (isFirstRun) {
    return (
      <Card className="relative flex flex-col items-center justify-center gap-3 overflow-hidden py-16 text-center">
        <OrbField />
        <div className="relative flex size-12 items-center justify-center rounded-full bg-muted">
          <Users className="size-6 text-muted-foreground" />
        </div>
        <div className="relative space-y-1">
          <p className="font-medium">{t("empty")}</p>
          <p className="text-sm text-muted-foreground">{t("emptyHint")}</p>
        </div>
        <Button asChild className="relative mt-2">
          <Link href="/customers/new">
            <Plus className="size-4" />
            {t("add")}
          </Link>
        </Button>
      </Card>
    );
  }

  return (
    <CustomersTable
      rows={list.rows}
      total={list.total}
      pageCount={list.pageCount}
      params={list.params}
    />
  );
}
