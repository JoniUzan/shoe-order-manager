"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/tabs";
import { useTranslations } from "next-intl";

import type { SettingsData, SettingsTab } from "@/lib/settings-query";

import { BusinessForm } from "./business-form";
import { PasswordForm } from "./password-form";
import { PreferencesForm } from "./preferences-form";
import { ProfileForm } from "./profile-form";

/**
 * The settings tabs, shared by the `/settings` page and the dialog that
 * intercepts it. The open tab is mirrored into `?tab=` with the native
 * history API (Next keeps `useSearchParams` in sync) so a reload or a shared
 * link lands on the same tab without a server round-trip per click.
 */
export function SettingsPanel({
  tab,
  data,
}: {
  tab: SettingsTab;
  data: SettingsData;
}) {
  const t = useTranslations("settings");

  function onTabChange(next: string) {
    const url = new URL(window.location.href);
    if (next === "profile") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }

  return (
    <Tabs defaultValue={tab} onValueChange={onTabChange} className="gap-6">
      <TabsList className="max-w-full overflow-x-auto">
        <TabsTrigger value="profile">{t("tabProfile")}</TabsTrigger>
        <TabsTrigger value="password">{t("tabPassword")}</TabsTrigger>
        <TabsTrigger value="preferences">{t("tabPreferences")}</TabsTrigger>
        <TabsTrigger value="business">{t("tabBusiness")}</TabsTrigger>
      </TabsList>
      <TabsContent value="profile">
        <ProfileForm defaultValues={data.profile} />
      </TabsContent>
      <TabsContent value="password">
        <PasswordForm />
      </TabsContent>
      <TabsContent value="preferences">
        <PreferencesForm defaultValues={data.preferences} />
      </TabsContent>
      <TabsContent value="business">
        <BusinessForm defaultValues={data.business} />
      </TabsContent>
    </Tabs>
  );
}
