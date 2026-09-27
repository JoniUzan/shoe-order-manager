import { notFound, redirect } from "next/navigation";

import { parseSettingsSection } from "@/lib/settings-query";

/**
 * The settings used to be a route; they are a dialog opened by the URL hash
 * now (`#settings/account`). Old links land on the dashboard with it open.
 */
export default async function SettingsRedirect({
  params,
}: {
  params: Promise<{ locale: string; section?: string[] }>;
}) {
  const { locale, section: segments } = await params;
  const section = parseSettingsSection(segments);
  if (section === undefined) notFound();
  redirect(`/${locale}#settings${section ? `/${section}` : ""}`);
}
