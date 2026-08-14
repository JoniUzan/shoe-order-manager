import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { getTranslations } from "next-intl/server";
import { Plus, Users } from "lucide-react";

import { CustomersTable } from "@/components/customers/customers-table";
import { PageHeader } from "@/components/layout/page-header";
import { Link } from "@/i18n/navigation";
import { listCustomers, parseCustomerListParams } from "@/lib/customers-query";
import { requireUser } from "@/lib/session";

export default async function CustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "customers" });

  const listParams = parseCustomerListParams(await searchParams);
  const list = await listCustomers(user.id, listParams);

  // "Nothing here yet" is a different state from "nothing matched" — only the
  // first one deserves the onboarding card. The table owns the second.
  const isFirstRun =
    list.total === 0 && listParams.q === "" && listParams.filter === "all";

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

      {isFirstRun ? (
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
        <CustomersTable
          rows={list.rows}
          total={list.total}
          pageCount={list.pageCount}
          params={list.params}
        />
      )}
    </div>
  );
}
