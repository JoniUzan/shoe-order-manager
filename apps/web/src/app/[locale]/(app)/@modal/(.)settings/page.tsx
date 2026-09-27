import { getTranslations } from "next-intl/server";

import { SettingsDialog } from "@/components/settings/settings-dialog";
import { SettingsPanel } from "@/components/settings/settings-panel";
import type { RawSearchParams } from "@/lib/list-params";
import { requireUser } from "@/lib/session";
import { getSettings, parseSettingsTab } from "@/lib/settings-query";

/** `/settings` reached by a link inside the app: shown over the current page. */
export default async function SettingsModal({
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
    <SettingsDialog title={t("title")} description={t("subtitle")}>
      <SettingsPanel tab={parseSettingsTab(sp.tab)} data={data} />
    </SettingsDialog>
  );
}
