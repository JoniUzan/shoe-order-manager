"use client";

import type { LocaleCode, ThemeCode } from "@repo/domain";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useState } from "react";
import { toast } from "sonner";

import { LOCALE_LABELS, routing } from "@/i18n/routing";
import { updatePreferences } from "@/lib/actions/settings";

import { Segmented } from "./segmented";
import { SettingRow, SettingSection } from "./setting-row";

/** Theme and language — each applies the moment it's picked. */
export function GeneralSection({
  locale,
  theme: savedTheme,
}: {
  locale: LocaleCode;
  theme: ThemeCode;
}) {
  const t = useTranslations("settings");
  const tTheme = useTranslations("theme");
  const { setTheme } = useTheme();
  const [theme, setThemeValue] = useState(savedTheme);
  const [switching, setSwitching] = useState(false);

  async function onThemeChange(next: ThemeCode) {
    setThemeValue(next);
    setTheme(next);
    const res = await updatePreferences({ theme: next });
    if (!res.ok) toast.error(t("errorGeneric"));
  }

  async function onLocaleChange(next: string) {
    if (next === locale) return;
    setSwitching(true);
    const res = await updatePreferences({ locale: next as LocaleCode });
    if (!res.ok) {
      setSwitching(false);
      toast.error(t("errorGeneric"));
      return;
    }
    // A full load, not router.replace: from inside the intercepted dialog a
    // client navigation to the other locale updates the URL but keeps the old
    // tree (still `dir="rtl"`, still Hebrew). The whole page changes language
    // and direction anyway, so there is nothing to preserve.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- see above
    window.location.assign(`/${next}/settings/general`);
  }

  return (
    <>
      <SettingSection title={t("appearance")}>
        <SettingRow label={t("theme")} description={t("themeHelp")}>
          <Segmented<ThemeCode>
            name="theme"
            label={t("theme")}
            value={theme}
            onChange={onThemeChange}
            options={[
              { value: "system", label: tTheme("system"), icon: <Monitor /> },
              { value: "light", label: tTheme("light"), icon: <Sun /> },
              { value: "dark", label: tTheme("dark"), icon: <Moon /> },
            ]}
          />
        </SettingRow>
      </SettingSection>

      <SettingSection title={t("languageSection")}>
        <SettingRow label={t("language")} description={t("languageHelp")}>
          <Select
            value={locale}
            onValueChange={onLocaleChange}
            disabled={switching}
          >
            <SelectTrigger
              aria-label={t("language")}
              className="h-9 gap-1.5 border-0 bg-transparent px-2 text-[15px] shadow-none hover:bg-accent dark:bg-transparent dark:hover:bg-muted"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {routing.locales.map((l) => (
                <SelectItem key={l} value={l}>
                  {LOCALE_LABELS[l]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
      </SettingSection>
    </>
  );
}
