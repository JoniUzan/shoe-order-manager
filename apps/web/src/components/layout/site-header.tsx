"use client";

import { Separator } from "@repo/ui/components/separator";
import { SidebarTrigger } from "@repo/ui/components/sidebar";
import type { AvatarCode } from "@repo/domain";
import { useTranslations } from "next-intl";

import { usePathname } from "@/i18n/navigation";
import { AccountButton } from "./nav-user";

function titleKeyForPath(pathname: string): string {
  if (pathname === "/" || pathname === "") return "dashboard";
  if (pathname.startsWith("/orders")) return "orders";
  if (pathname.startsWith("/customers")) return "customers";
  if (pathname.startsWith("/catalog")) return "catalog";
  if (pathname.startsWith("/reports")) return "reports";
  return "dashboard";
}

export function SiteHeader({
  user,
}: {
  user: { name: string; email: string; avatar: AvatarCode };
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const title = t(titleKeyForPath(pathname));

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      {/* A phone has the tab bar instead of the sidebar, and the account
          menu moves up here from the sidebar's foot. */}
      <SidebarTrigger className="-ms-1 max-md:hidden" />
      <Separator
        orientation="vertical"
        className="me-2 data-[orientation=vertical]:h-4 max-md:hidden"
      />
      <h1 className="text-base font-medium">{title}</h1>
      <AccountButton user={user} className="ms-auto -me-1 md:hidden" />
    </header>
  );
}
