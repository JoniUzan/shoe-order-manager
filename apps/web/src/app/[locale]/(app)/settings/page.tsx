import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/layout/page-header";
import { SettingsPanel } from "@/components/settings/settings-panel";
import type { RawSearchParams } from "@/lib/list-params";
import { requireUser } from "@/lib/session";
import { getSettings, parseSettingsTab } from "@/lib/settings-query";

/** Settings as a full page — a reload or a direct link to `/settings`. */
export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const user = await requireUser(locale);
  const t = await getTranslations({ locale, namespace: "settings" });
  const data = await getSettings(user.id);

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <SettingsPanel tab={parseSettingsTab(sp.tab)} data={data} />
    </div>
  );
}
