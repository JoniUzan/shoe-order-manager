"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  CircleUser,
  Languages,
  Lock,
  LogOut,
  Moon,
  Store,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { orbSrc } from "@/components/ui/orb";
import { LOCALE_LABELS } from "@/i18n/routing";
import { signOutAction } from "@/lib/actions/auth-actions";
import type { SettingsData } from "@/lib/settings-query";
import type { SettingsSection } from "@/lib/settings-sections";

import { PasswordDialog } from "./password-dialog";
import { SectionLink } from "./section-link";

/** The phone's first screen: grouped cards of rows that open a section. */
export function SettingsMenu({ data }: { data: SettingsData }) {
  const t = useTranslations("settings");
  const tTheme = useTranslations("theme");
  const locale = useLocale();
  const Forward = locale === "he" ? ChevronLeft : ChevronRight;
  const [passwordOpen, setPasswordOpen] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <SectionLink
          section="account"
          className="flex items-center gap-3 px-4 py-3.5"
        >
          <Avatar className="size-11 rounded-full">
            <AvatarImage src={orbSrc(data.email || data.name)} alt="" />
            <AvatarFallback className="rounded-full">
              {(data.name || data.email).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-medium">
              {data.name || data.email}
            </div>
            <div
              dir="ltr"
              className={cn(
                "truncate text-[13.5px] text-muted-foreground",
                locale === "he" && "text-right",
              )}
            >
              {data.email}
            </div>
          </div>
          <Forward className="size-[18px] shrink-0 text-muted-foreground" />
        </SectionLink>
      </Card>

      <Group title={t("groupAccount")}>
        <Row
          section="account"
          icon={<CircleUser />}
          label={t("profileRow")}
          forward={<Forward />}
        />
        <Row
          onClick={() => setPasswordOpen(true)}
          icon={<Lock />}
          label={t("passwordRow")}
          forward={<Forward />}
        />
      </Group>

      <Group title={t("groupPreferences")}>
        <Row
          section="general"
          icon={<Moon />}
          label={t("themeRow")}
          value={tTheme(data.theme)}
          forward={<Forward />}
        />
        <Row
          section="general"
          icon={<Languages />}
          label={t("languageRow")}
          value={LOCALE_LABELS[data.locale]}
          forward={<Forward />}
        />
      </Group>

      <Group title={t("groupBusiness")}>
        <Row
          section="business"
          icon={<Store />}
          label={t("businessDetails")}
          value={data.business.businessName}
          forward={<Forward />}
        />
      </Group>

      <Card>
        <form action={signOutAction}>
          <input type="hidden" name="locale" value={locale} />
          <Row type="submit" icon={<LogOut />} label={t("signOut")} destructive />
        </form>
      </Card>

      <PasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-background dark:bg-muted">
      {children}
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="px-4 text-[13px] text-muted-foreground">{title}</h3>
      <Card>{children}</Card>
    </section>
  );
}

/**
 * A menu row: a link to a section, or a button. The divider starts after the
 * icon (it belongs to the text column), and the last row has none.
 */
function Row({
  section,
  onClick,
  type = "button",
  icon,
  label,
  value,
  forward,
  destructive,
}: {
  section?: SettingsSection;
  onClick?: () => void;
  type?: "button" | "submit";
  icon: ReactNode;
  label: string;
  value?: string;
  forward?: ReactNode;
  destructive?: boolean;
}) {
  const content = (
    <>
      <span className="[&_svg]:size-5">{icon}</span>
      <span className="flex min-h-13 min-w-0 flex-1 items-center justify-between gap-3 self-stretch border-b pe-3.5 group-last/row:border-b-0">
        <span className="text-base">{label}</span>
        <span className="flex min-w-0 items-center gap-1.5 text-[15px] text-muted-foreground [&_svg]:size-[18px] [&_svg]:shrink-0">
          {value && <span className="truncate">{value}</span>}
          {forward}
        </span>
      </span>
    </>
  );
  const className = cn(
    "group/row flex w-full items-center gap-3.5 ps-4 text-start active:bg-accent",
    destructive && "text-destructive",
  );

  if (section) {
    return (
      <SectionLink section={section} className={className}>
        {content}
      </SectionLink>
    );
  }
  return (
    <button type={type} onClick={onClick} className={className}>
      {content}
    </button>
  );
}
