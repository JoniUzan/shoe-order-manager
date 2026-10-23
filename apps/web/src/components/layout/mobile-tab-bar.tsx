"use client";

import { cn } from "@repo/ui/lib/utils";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { isNavActive, NAV_ITEMS } from "./nav-main";
import { FORM_PAGE } from "./quick-actions";

/**
 * The phone's navigation, in place of the sidebar: the five sections on a
 * floating bar of clear glass (`.glass-bar`) at the foot of the screen, a
 * pill sliding to the one you're in. Hidden on a form, whose own bottom bar
 * holds its buttons.
 */
export function MobileTabBar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  if (FORM_PAGE.test(pathname)) return null;
  const active = NAV_ITEMS.findIndex(({ href }) => isNavActive(href, pathname));

  return (
    <nav
      aria-label={t("main")}
      className="glass-bar fixed inset-x-4 bottom-6 z-30 h-16 rounded-full p-1 md:hidden"
    >
      <div className="relative flex h-full">
        {active >= 0 && (
          <span
            aria-hidden
            className="absolute inset-y-0 w-1/5 rounded-full bg-foreground/[0.09] transition-[inset-inline-start] duration-[420ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none dark:bg-foreground/12"
            style={{ insetInlineStart: `${active * 20}%` }}
          />
        )}
        {NAV_ITEMS.map(({ href, key, icon: Icon }, i) => {
          const current = i === active;
          return (
            <Link
              key={href}
              href={href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[10.5px] outline-none transition-[scale,color] duration-150 ease-(--ease-out-quint) focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-95",
                current
                  ? "font-semibold text-foreground"
                  : "font-medium text-foreground/70 dark:text-foreground/80",
              )}
            >
              <Icon
                aria-hidden
                className="size-[23px]"
                strokeWidth={current ? 2.1 : 1.8}
              />
              <span className="max-w-full truncate">{t(key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
