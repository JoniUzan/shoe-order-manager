"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@repo/ui/components/sidebar";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Package,
  Users,
  Footprints,
  BarChart3,
} from "lucide-react";
import type { ComponentType } from "react";

import { Link, usePathname } from "@/i18n/navigation";

const ITEMS: {
  href: string;
  key: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { href: "/", key: "dashboard", icon: LayoutDashboard },
  { href: "/orders", key: "orders", icon: Package },
  { href: "/customers", key: "customers", icon: Users },
  { href: "/catalog", key: "catalog", icon: Footprints },
  { href: "/reports", key: "reports", icon: BarChart3 },
];

export function NavMain() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {ITEMS.map(({ href, key, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton asChild isActive={active} tooltip={t(key)}>
                  <Link href={href}>
                    <Icon className="h-4 w-4" />
                    <span>{t(key)}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
