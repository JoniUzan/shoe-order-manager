"use client";

import type { AvatarCode } from "@repo/domain";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@repo/ui/components/sidebar";
import { useTranslations } from "next-intl";
import { Footprints } from "lucide-react";
import type { ComponentProps } from "react";

import { Link } from "@/i18n/navigation";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

export function AppSidebar({
  user,
  ...props
}: ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string; avatar: AvatarCode };
}) {
  const t = useTranslations("app");

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-auto py-2">
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-card text-foreground shadow-[var(--shadow-raised)]">
                  <Footprints className="size-4" />
                </div>
                <div className="grid min-w-0 flex-1 text-start leading-tight">
                  <span className="truncate font-semibold">{t("name")}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {t("tagline")}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
