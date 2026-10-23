"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Link, usePathname } from "@/i18n/navigation";
import { isNavActive, NAV_ITEMS } from "./nav-main";
import { FORM_PAGE } from "./quick-actions";

const SLOT = 100 / NAV_ITEMS.length;

/**
 * The phone's navigation, in place of the sidebar: the five sections on a
 * floating bar of clear glass (`.glass-bar`) at the foot of the screen.
 *
 * The current tab is shown by a second, inked copy of the tabs laid over the
 * first and clipped to one slot, so its pill and its colour move as one piece
 * instead of two transitions drifting apart. The clip moves the moment a
 * finger lands on a tab, before the page has loaded, as iOS does; it settles
 * on the URL once the navigation lands. Hidden on a form, whose own bottom
 * bar holds its buttons.
 */
export function MobileTabBar() {
  const t = useTranslations("nav");
  const rtl = useLocale() === "he";
  const pathname = usePathname();
  // The tab under the finger, for as long as the URL it was pressed on stands.
  const [pressed, setPressed] = useState<{ index: number; on: string } | null>(
    null,
  );

  if (FORM_PAGE.test(pathname)) return null;
  const active = NAV_ITEMS.findIndex(({ href }) => isNavActive(href, pathname));
  const shown = pressed?.on === pathname ? pressed.index : active;

  // `inset` is physical (top right bottom left), so a Hebrew bar, whose first
  // tab is on the right, clips from the other side.
  const fromStart = `${shown * SLOT}%`;
  const fromEnd = `${(NAV_ITEMS.length - 1 - shown) * SLOT}%`;
  const [right, left] = rtl ? [fromStart, fromEnd] : [fromEnd, fromStart];

  return (
    <nav
      aria-label={t("main")}
      className="glass-bar fixed inset-x-4 bottom-6 z-30 h-16 rounded-full p-1 md:hidden"
    >
      <div className="relative h-full">
        <div className="flex h-full">
          {NAV_ITEMS.map(({ href, key, icon: Icon }, i) => (
            <Link
              key={href}
              href={href}
              aria-current={i === active ? "page" : undefined}
              onPointerDown={() => setPressed({ index: i, on: pathname })}
              onPointerCancel={() => setPressed(null)}
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[10.5px] font-medium text-foreground/70 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:text-foreground/80"
            >
              <Icon aria-hidden className="size-[23px]" strokeWidth={1.9} />
              <span className="max-w-full truncate">{t(key)}</span>
            </Link>
          ))}
        </div>
        {shown >= 0 && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex rounded-full bg-foreground/[0.09] text-foreground transition-[clip-path] duration-[250ms] ease-(--ease-in-out-quint) motion-reduce:transition-none dark:bg-foreground/12"
            style={{
              clipPath: `inset(0 ${right} 0 ${left} round 9999px)`,
            }}
          >
            {NAV_ITEMS.map(({ href, key, icon: Icon }) => (
              <span
                key={href}
                className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium"
              >
                <Icon aria-hidden className="size-[23px]" strokeWidth={1.9} />
                <span className="max-w-full truncate">{t(key)}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
