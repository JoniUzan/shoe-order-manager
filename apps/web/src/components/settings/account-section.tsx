"use client";

import { Button } from "@repo/ui/components/button";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { signOutAction } from "@/lib/actions/auth-actions";
import { updateName } from "@/lib/actions/settings";

import { AutosaveInput } from "./autosave-input";
import { EmailDialog } from "./email-dialog";
import { PasswordDialog } from "./password-dialog";
import { SettingRow, SettingSection, useSettingsPhone } from "./setting-row";

export function AccountSection({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const t = useTranslations("settings");
  const locale = useLocale();
  const phone = useSettingsPhone();
  const [emailOpen, setEmailOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  return (
    <>
      <SettingSection title={t("profile")}>
        <SettingRow label={t("name")} htmlFor="settings-name">
          <AutosaveInput
            id="settings-name"
            autoComplete="name"
            defaultValue={name}
            validate={(v) => (v ? undefined : "required")}
            onSave={async (v) => (await updateName({ name: v })).ok}
          />
        </SettingRow>
        <SettingRow
          label={t("email")}
          description={phone ? undefined : t("emailHelp")}
        >
          <span
            dir="ltr"
            className="min-w-0 truncate text-[15px] text-muted-foreground"
          >
            {email}
          </span>
          <Button variant="secondary" onClick={() => setEmailOpen(true)}>
            {t("change")}
          </Button>
        </SettingRow>
      </SettingSection>

      <SettingSection title={t("security")}>
        <SettingRow label={t("password")}>
          <span dir="ltr" className="text-[15px] text-muted-foreground">
            ••••••••
          </span>
          <Button variant="secondary" onClick={() => setPasswordOpen(true)}>
            {t("change")}
          </Button>
        </SettingRow>
        <SettingRow
          label={t("signOut")}
          description={phone ? undefined : t("signOutHelp")}
        >
          <form action={signOutAction}>
            <input type="hidden" name="locale" value={locale} />
            <Button
              type="submit"
              variant="outline"
              className="text-destructive hover:text-destructive"
            >
              {t("signOut")}
            </Button>
          </form>
        </SettingRow>
      </SettingSection>

      <EmailDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        currentEmail={email}
      />
      <PasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </>
  );
}
