import { notFound } from "next/navigation";

import { SettingsDialog } from "@/components/settings/settings-dialog";
import { requireUser } from "@/lib/session";
import { getSettings, parseSettingsSection } from "@/lib/settings-query";

/** `/settings/…` followed from inside the app: shown over the current page. */
export default async function SettingsModal({
  params,
}: {
  params: Promise<{ locale: string; section?: string[] }>;
}) {
  const { locale, section: segments } = await params;
  const section = parseSettingsSection(segments);
  if (section === undefined) notFound();
  const user = await requireUser(locale);
  const data = await getSettings(user.id);

  return <SettingsDialog section={section} data={data} />;
}
