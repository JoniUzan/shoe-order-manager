"use client";

import type { LocaleCode, ThemeCode } from "@repo/domain";
import { Label } from "@repo/ui/components/label";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useState } from "react";
import { toast } from "sonner";

import { LOCALE_LABELS, routing } from "@/i18n/routing";
import { updatePreferences } from "@/lib/actions/settings";

const THEME_OPTIONS = [
  { value: "light", Icon: Sun },
  { value: "dark", Icon: Moon },
  { value: "system", Icon: Monitor },
] as const;

/**
 * Applies each choice at once, like the account menu's switches — there is
 * nothing to review before saving a language or a theme.
 */
export function PreferencesForm({
  defaultValues,
}: {
  defaultValues: { locale: LocaleCode; theme: ThemeCode };
}) {
  const t = useTranslations("settings");
  const tTheme = useTranslations("theme");
  const { setTheme } = useTheme();
  const [locale, setLocale] = useState(defaultValues.locale);
  const [theme, setThemeValue] = useState(defaultValues.theme);
  const [pending, setPending] = useState(false);

  async function onLocaleChange(next: string) {
    if (!next || next === locale) return;
    setPending(true);
    const res = await updatePreferences({ locale: next as LocaleCode });
    setPending(false);
    if (!res.ok) {
      toast.error(t("errorGeneric"));
      return;
    }
    setLocale(next as LocaleCode);
    // A full load, not router.replace: from inside the intercepted dialog a
    // client navigation to the other locale updates the URL but keeps the old
    // tree (still `dir="rtl"`, still Hebrew). The whole page changes language
    // and direction anyway, so there is nothing to preserve.
    window.location.assign(`/${next}/settings?tab=preferences`);
  }

  async function onThemeChange(next: string) {
    if (!next || next === theme) return;
    setThemeValue(next as ThemeCode);
    setTheme(next);
    const res = await updatePreferences({ theme: next as ThemeCode });
    if (!res.ok) toast.error(t("errorGeneric"));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label id="settings-language">{t("language")}</Label>
        <ToggleGroup
          type="single"
          variant="outline"
          value={locale}
          onValueChange={onLocaleChange}
          disabled={pending}
          aria-labelledby="settings-language"
          className="w-fit"
        >
          {routing.locales.map((l) => (
            <ToggleGroupItem key={l} value={l} className="px-4">
              {LOCALE_LABELS[l]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="text-sm text-muted-foreground">{t("languageHelp")}</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label id="settings-theme">{t("theme")}</Label>
        <ToggleGroup
          type="single"
          variant="outline"
          value={theme}
          onValueChange={onThemeChange}
          aria-labelledby="settings-theme"
          className="w-fit"
        >
          {THEME_OPTIONS.map(({ value, Icon }) => (
            <ToggleGroupItem key={value} value={value} className="px-4">
              <Icon className="size-4" />
              {tTheme(value)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="text-sm text-muted-foreground">{t("themeHelp")}</p>
      </div>
    </div>
  );
}
