"use client";

import { Separator } from "@repo/ui/components/separator";
import { SidebarTrigger } from "@repo/ui/components/sidebar";
import { useTranslations } from "next-intl";

import { usePathname } from "@/i18n/navigation";

function titleKeyForPath(pathname: string): string {
  if (pathname === "/" || pathname === "") return "dashboard";
  if (pathname.startsWith("/orders")) return "orders";
  if (pathname.startsWith("/customers")) return "customers";
  if (pathname.startsWith("/catalog")) return "catalog";
  if (pathname.startsWith("/reports")) return "reports";
  if (pathname.startsWith("/settings")) return "settings";
  return "dashboard";
}

export function SiteHeader() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const title = t(titleKeyForPath(pathname));

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ms-1" />
      <Separator
        orientation="vertical"
        className="me-2 data-[orientation=vertical]:h-4"
      />
      <h1 className="text-base font-medium">{title}</h1>
    </header>
  );
}
