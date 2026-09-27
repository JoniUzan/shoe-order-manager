"use client";

import { cn } from "@repo/ui/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  CircleUser,
  Settings,
  Store,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";
import type { SettingsData, SettingsSection } from "@/lib/settings-query";

import { AccountSection } from "./account-section";
import { BusinessSection } from "./business-section";
import { GeneralSection } from "./general-section";
import { SettingsPhoneProvider } from "./setting-row";
import { SettingsMenu } from "./settings-menu";

const NAV: { id: SettingsSection; Icon: typeof Settings }[] = [
  { id: "general", Icon: Settings },
  { id: "account", Icon: CircleUser },
  { id: "business", Icon: Store },
];

function SectionContent({
  section,
  data,
}: {
  section: SettingsSection;
  data: SettingsData;
}) {
  switch (section) {
    case "general":
      return <GeneralSection locale={data.locale} theme={data.theme} />;
    case "account":
      return <AccountSection name={data.name} email={data.email} />;
    case "business":
      return <BusinessSection business={data.business} />;
  }
}

/**
 * The settings, in the dialog or on the `/settings` page. On a computer: a
 * side menu and the open section (General when none is named). On a phone:
 * the section menu, or one section with a back arrow. Sections are routes
 * (`/settings/business`), switched with `replace` so closing the dialog
 * (history back) returns to the page it was opened from.
 */
export function SettingsShell({
  section,
  data,
  phone,
  onClose,
}: {
  section: SettingsSection | null;
  data: SettingsData;
  phone: boolean;
  onClose?: () => void;
}) {
  const t = useTranslations("settings");
  const locale = useLocale();

  if (phone) {
    const Back = locale === "he" ? ChevronRight : ChevronLeft;
    return (
      <SettingsPhoneProvider value={true}>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="grid shrink-0 grid-cols-[40px_1fr_40px] items-center px-4 pt-2 pb-3">
            {section ? (
              <RoundButton label={t("back")} href="/settings">
                <Back />
              </RoundButton>
            ) : onClose ? (
              <RoundButton label={t("close")} onClick={onClose}>
                <X />
              </RoundButton>
            ) : (
              <span />
            )}
            <h2 className="text-center text-[17px] font-semibold">
              {section ? t(`mobileTitle.${section}`) : t("title")}
            </h2>
            {section && onClose ? (
              <RoundButton label={t("close")} onClick={onClose}>
                <X />
              </RoundButton>
            ) : (
              <span />
            )}
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-8">
            {section ? (
              <SectionContent section={section} data={data} />
            ) : (
              <SettingsMenu data={data} />
            )}
          </div>
        </div>
      </SettingsPhoneProvider>
    );
  }

  const open = section ?? "general";
  return (
    <SettingsPhoneProvider value={false}>
      <div className="flex min-h-0 flex-1">
        <nav
          aria-label={t("title")}
          className="flex w-66 shrink-0 flex-col gap-0.5 border-e px-4 py-7"
        >
          <div className="px-3 pb-2.5 text-[13px] text-muted-foreground">
            {t("title")}
          </div>
          {NAV.map(({ id, Icon }) => (
            <Link
              key={id}
              href={`/settings/${id}`}
              replace
              aria-current={id === open ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-[10px] px-3 text-[15px] transition-colors",
                id === open
                  ? "bg-accent font-medium dark:bg-muted"
                  : "hover:bg-accent/60 dark:hover:bg-muted/60",
              )}
            >
              <Icon className="size-[18px]" />
              {t(`nav.${id}`)}
            </Link>
          ))}
        </nav>
        <div className="relative min-w-0 flex-1 overflow-y-auto px-16 py-14">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t("close")}
              className="absolute end-5 top-5 grid size-9 place-items-center rounded-full transition-colors hover:bg-accent dark:hover:bg-muted"
            >
              <X className="size-5" />
            </button>
          )}
          <div className="flex flex-col gap-10">
            <SectionContent section={open} data={data} />
          </div>
        </div>
      </div>
    </SettingsPhoneProvider>
  );
}

function RoundButton({
  label,
  href,
  onClick,
  children,
}: {
  label: string;
  href?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const className =
    "grid size-10 place-items-center rounded-full border bg-background dark:bg-muted [&_svg]:size-5";
  if (href) {
    return (
      <Link href={href} replace aria-label={label} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} className={className}>
      {children}
    </button>
  );
}
