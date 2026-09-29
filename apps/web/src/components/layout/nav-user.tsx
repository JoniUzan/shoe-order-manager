"use client";

import type { AvatarCode } from "@repo/domain";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@repo/ui/components/sidebar";
import { useLocale, useTranslations } from "next-intl";
import {
  ChevronsUpDown,
  Languages,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useTransition } from "react";

import { avatarSrc } from "@/components/ui/orb";
import { LOCALE_LABELS, routing, type Locale } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";
import { signOutAction } from "@/lib/actions/auth-actions";
import { updatePreferences } from "@/lib/actions/settings";
import { openSettings } from "@/components/settings/settings-hash";

const THEMES = [
  { value: "light", Icon: Sun },
  { value: "dark", Icon: Moon },
  { value: "system", Icon: Monitor },
] as const;

export function NavUser({
  user,
}: {
  user: { name: string; email: string; avatar: AvatarCode };
}) {
  const t = useTranslations("nav");
  const tTheme = useTranslations("theme");
  const locale = useLocale();
  const { isMobile } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const ThemeIcon = THEMES.find(({ value }) => value === theme)?.Icon ?? Sun;
  const [, startTransition] = useTransition();

  const initials =
    (user.name || user.email).trim().charAt(0).toUpperCase() || "?";
  const orb = avatarSrc(user.avatar);

  // The quick switches also save to the account (fire-and-forget: the switch
  // itself already happened on this device), so they match the settings.
  function switchLocale(next: string) {
    if (next === locale) return;
    void updatePreferences({ locale: next as Locale });
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  function switchTheme(next: string) {
    setTheme(next);
    void updatePreferences({ theme: next as (typeof THEMES)[number]["value"] });
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-full">
                <AvatarImage src={orb} alt="" />
                <AvatarFallback className="rounded-full">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-start text-sm leading-tight">
                <span className="truncate font-medium">
                  {user.name || user.email}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDown className="ms-auto size-4 shrink-0" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            // The sidebar sits on the start edge, so the menu opens toward the
            // page: right in English, left in Hebrew.
            side={isMobile ? "bottom" : locale === "he" ? "left" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarImage src={orb} alt="" />
                  <AvatarFallback className="rounded-full">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user.name || user.email}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => openSettings()}>
              <Settings className="size-4" />
              {t("settings")}
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Languages className="size-4" />
                {t("language")}
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={locale}
                    onValueChange={switchLocale}
                  >
                    {routing.locales.map((l) => (
                      <DropdownMenuRadioItem key={l} value={l}>
                        {LOCALE_LABELS[l]}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ThemeIcon className="size-4" />
                {tTheme("label")}
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={theme}
                    onValueChange={switchTheme}
                  >
                    {THEMES.map(({ value, Icon }) => (
                      <DropdownMenuRadioItem key={value} value={value}>
                        <Icon className="size-4" />
                        {tTheme(value)}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <form action={signOutAction}>
              <input type="hidden" name="locale" value={locale} />
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full">
                  <LogOut className="size-4" />
                  {t("signOut")}
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
