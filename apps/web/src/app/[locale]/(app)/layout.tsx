import { SidebarInset, SidebarProvider } from "@repo/ui/components/sidebar";
import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import { requireUser } from "@/lib/session";

export default async function AppLayout({
  children,
  modal,
  params,
}: {
  children: ReactNode;
  /** `@modal` — the settings dialog when `/settings` is opened in-app. */
  modal: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireUser(locale);
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
      {modal}
    </SidebarProvider>
  );
}
