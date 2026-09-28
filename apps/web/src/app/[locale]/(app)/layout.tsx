import { SidebarInset, SidebarProvider } from "@repo/ui/components/sidebar";
import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import { OnboardingHost } from "@/components/onboarding/onboarding-host";
import { SettingsHost } from "@/components/settings/settings-host";
import { ThemeSync } from "@/components/settings/theme-sync";
import { requireUser } from "@/lib/session";
import { toSettingsData } from "@/lib/settings-query";

export default async function AppLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireUser(locale);
  const side = locale === "he" ? "right" : "left";
  const settings = toSettingsData(user);

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
      {/* The settings dialog, which any page can open (`#settings/…`). */}
      <SettingsHost data={settings} />
      {/* A new User's welcome dialog, until they finish it. */}
      {!user.onboardedAt && <OnboardingHost data={settings} />}
      <ThemeSync theme={user.theme} />
    </SidebarProvider>
  );
}
