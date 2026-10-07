import { SidebarInset, SidebarProvider } from "@repo/ui/components/sidebar";
import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { HashSync } from "@/components/layout/hash-sync";
import { QuickActions } from "@/components/layout/quick-actions";
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
        user={{
          name: user.name ?? "",
          email: user.email ?? "",
          avatar: settings.avatar,
        }}
        variant="inset"
      />
      {/* A stepped form fills the window on a computer and scrolls inside
          its pane, so the panel is held to the window's height (less the
          inset's 8px margins) on those pages only. */}
      <SidebarInset className="md:has-[[data-slot=step-form]]:h-[calc(100svh-1rem)]">
        <SiteHeader />
        {/* On a phone, room under the last row for the quick-action button
            (except on a form, which hides it). A computer has space beside it. */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 pb-24 has-[[data-slot=step-form]]:pb-4 md:p-6">
          {children}
        </div>
      </SidebarInset>
      {/* New order / Customer / Shoe model, from any page but a form. */}
      <QuickActions />
      {/* The settings dialog, which any page can open (`#settings/…`). */}
      <SettingsHost data={settings} />
      {/* A new User's welcome dialog, until they finish it. */}
      {!user.onboardedAt && <OnboardingHost data={settings} />}
      <ThemeSync theme={user.theme} />
      {/* Hands a hash the browser changed by itself to Next's router. */}
      <HashSync />
    </SidebarProvider>
  );
}
