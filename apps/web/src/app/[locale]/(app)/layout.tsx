import { SidebarInset, SidebarProvider } from "@repo/ui/components/sidebar";
import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import { SettingsHost } from "@/components/settings/settings-host";
import { ThemeSync } from "@/components/settings/theme-sync";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings-query";

export default async function AppLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireUser(locale);
  // For the settings dialog, which any page can open (`#settings/…`).
  const settings = await getSettings(user.id);
  const side = locale === "he" ? "right" : "left";

  return (
    <SidebarProvider>
      <AppSidebar
        side={side}
        user={{ name: user.name ?? "", email: user.email ?? "" }}
        variant="inset"
      />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
      <SettingsHost data={settings} />
      <ThemeSync theme={user.theme} />
    </SidebarProvider>
  );
}
