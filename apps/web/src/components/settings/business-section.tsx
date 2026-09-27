"use client";

import { businessSchema, type BusinessInput } from "@repo/domain";
import { useTranslations } from "next-intl";

import { updateBusiness } from "@/lib/actions/settings";

import { AutosaveInput } from "./autosave-input";
import { SettingRow, SettingSection, useSettingsPhone } from "./setting-row";

const FIELDS = [
  { key: "businessName", autoComplete: "organization" },
  { key: "businessPhone", autoComplete: "tel", type: "tel", dir: "ltr" },
  { key: "businessAddress", autoComplete: "street-address" },
  { key: "businessTaxId", autoComplete: "off", dir: "ltr", inputMode: "numeric" },
] as const;

/** Printed on every order; each field saves on its own as it's left. */
export function BusinessSection({ business }: { business: BusinessInput }) {
  const t = useTranslations("settings");
  const phone = useSettingsPhone();

  return (
    <SettingSection
      // On a phone the sheet is already titled "Business details".
      title={phone ? undefined : t("businessDetails")}
      description={t("businessHelp")}
    >
      {FIELDS.map((field) => (
        <SettingRow
          key={field.key}
          label={t(field.key)}
          htmlFor={`settings-${field.key}`}
        >
          <AutosaveInput
            id={`settings-${field.key}`}
            autoComplete={field.autoComplete}
            type={"type" in field ? field.type : undefined}
            dir={"dir" in field ? field.dir : undefined}
            inputMode={"inputMode" in field ? field.inputMode : undefined}
            placeholder={t(`placeholders.${field.key}`)}
            defaultValue={business[field.key] ?? ""}
            validate={(v) =>
              businessSchema.shape[field.key].safeParse(v).error?.issues[0]
                ?.message
            }
            onSave={async (v) =>
              (await updateBusiness({ [field.key]: v })).ok
            }
          />
        </SettingRow>
      ))}
    </SettingSection>
  );
}
