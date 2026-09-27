import { notFound } from "next/navigation";

import { SettingsPage } from "@/components/settings/settings-page";
import { requireUser } from "@/lib/session";
import { getSettings, parseSettingsSection } from "@/lib/settings-query";

/** Settings as a full page — a reload or a direct link to `/settings/…`. */
export default async function SettingsRoute({
  params,
}: {
  params: Promise<{ locale: string; section?: string[] }>;
}) {
  const { locale, section: segments } = await params;
  const section = parseSettingsSection(segments);
  if (section === undefined) notFound();
  const user = await requireUser(locale);
  const data = await getSettings(user.id);

  return <SettingsPage section={section} data={data} />;
}
