"use client";

import {
  businessSchema,
  type AvatarCode,
  type LocaleCode,
} from "@repo/domain";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Ref } from "react";

import {
  OrderHeaderPreview,
  type BusinessValues,
} from "@/components/business/order-header-preview";
import { AvatarPicker } from "@/components/settings/avatar-picker";
import { FieldError } from "@/components/settings/field-error";
import { avatarSrc } from "@/components/ui/orb";
import { LOCALE_LABELS, routing } from "@/i18n/routing";

/* ----------------------------- 1 · Language ----------------------------- */

export function LanguageStep({
  value,
  onPick,
  disabled,
  phone,
}: {
  value: LocaleCode;
  onPick: (locale: LocaleCode) => void;
  disabled: boolean;
  phone: boolean;
}) {
  const t = useTranslations("onboarding");

  return (
    <>
      <div
        role="radiogroup"
        aria-label={t("languageLabel")}
        className={cn("flex gap-4", phone ? "w-full flex-col" : "w-[520px] max-w-full")}
      >
        {routing.locales.map((code) => {
          const picked = code === value;
          return (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={picked}
              disabled={disabled}
              onClick={() => onPick(code)}
              className={cn(
                "relative flex flex-1 flex-col items-start justify-end gap-1 rounded-[22px] border bg-card px-5.5 py-5 text-start transition-shadow",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                phone ? "h-24" : "h-36",
                picked ? "surface-raised ring-2 ring-primary" : "hover:border-foreground/20",
              )}
            >
              <span
                lang={code}
                className={cn("tracking-tight", phone ? "text-[26px]" : "text-[34px]")}
              >
                {LOCALE_LABELS[code]}
              </span>
              <span className="text-[13px] text-muted-foreground">
                {t(code === "he" ? "rightToLeft" : "leftToRight")}
              </span>
              {picked && (
                <span className="absolute end-4 top-4 grid size-6.5 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-[15px]" strokeWidth={2.4} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[13px] text-muted-foreground">{t("changeLater")}</p>
    </>
  );
}

/* ---------------------------- 2 · Make it yours --------------------------- */

export function YoursStep({
  name,
  onNameChange,
  onNameBlur,
  avatar,
  onAvatarChange,
  phone,
}: {
  name: string;
  onNameChange: (name: string) => void;
  onNameBlur: () => void;
  avatar: AvatarCode;
  onAvatarChange: (avatar: AvatarCode) => void;
  phone: boolean;
}) {
  const t = useTranslations("onboarding");

  return (
    <>
      {/* The name pill, with the picked orb in it. */}
      <div
        className={cn(
          "rounded-full p-1.5 shadow-[0_0_0_1px_var(--border),0_0_0_8px_color-mix(in_oklch,var(--foreground)_4%,transparent),0_0_0_9px_var(--border)]",
          phone ? "w-full" : "w-[400px] max-w-full",
        )}
      >
        <label className="flex h-15 items-center gap-3 rounded-full border bg-card ps-2 pe-5">
          {/* eslint-disable-next-line @next/next/no-img-element -- a small local image */}
          <img
            src={avatarSrc(avatar)}
            alt=""
            className="size-11 shrink-0 rounded-full"
          />
          <span className="sr-only">{t("nameLabel")}</span>
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onBlur={onNameBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            placeholder={t("namePlaceholder")}
            maxLength={100}
            // The end padding balances the orb, so the name is centred.
            className="min-w-0 flex-1 bg-transparent pe-11 text-center text-lg outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      <AvatarPicker defaultValue={avatar} onChange={onAvatarChange} compact={phone} />
    </>
  );
}

/* ------------------------------ 3 · Business ------------------------------ */

export type { BusinessValues };

const FIELDS = [
  { key: "businessName", autoComplete: "organization" },
  { key: "businessPhone", autoComplete: "tel", type: "tel", dir: "ltr", placeholder: "050-0000000" },
  { key: "businessAddress", autoComplete: "street-address" },
  { key: "businessTaxId", autoComplete: "off", inputMode: "numeric" },
] as const;

export function BusinessStep({
  values,
  onChange,
  onBlur,
  nameMissing,
  nameRef,
  phone,
}: {
  values: BusinessValues;
  onChange: (key: keyof BusinessValues, value: string) => void;
  onBlur: (key: keyof BusinessValues) => void;
  /** Finish was pressed without a business name. */
  nameMissing: boolean;
  nameRef: Ref<HTMLInputElement>;
  phone: boolean;
}) {
  const t = useTranslations("onboarding");
  const tSettings = useTranslations("settings");

  return (
    <div
      className={cn(
        "flex",
        phone ? "w-full flex-col gap-4.5" : "items-start gap-10",
      )}
    >
      <OrderHeaderPreview
        values={values}
        compact={phone}
        className={phone ? "w-full" : "w-[380px]"}
      />

      <div className={cn("flex flex-col", phone ? "w-full gap-3" : "w-[340px] gap-3.5")}>
        {FIELDS.map((field) => {
          const isName = field.key === "businessName";
          const error = isName
            ? nameMissing && !values.businessName.trim()
            : undefined;
          const invalid = businessSchema.shape[field.key].safeParse(
            values[field.key],
          ).error?.issues[0]?.message;
          return (
            <div key={field.key} className="flex flex-col gap-1.5">
              <Label htmlFor={`welcome-${field.key}`}>
                {tSettings(field.key)}
                {isName && (
                  <span className="font-normal text-muted-foreground">
                    {t("required")}
                  </span>
                )}
              </Label>
              <Input
                ref={isName ? nameRef : undefined}
                id={`welcome-${field.key}`}
                type={"type" in field ? field.type : "text"}
                dir={"dir" in field ? field.dir : undefined}
                inputMode={"inputMode" in field ? field.inputMode : undefined}
                autoComplete={field.autoComplete}
                placeholder={
                  "placeholder" in field
                    ? field.placeholder
                    : t(`placeholders.${field.key}`)
                }
                value={values[field.key]}
                onChange={(e) => onChange(field.key, e.target.value)}
                onBlur={() => onBlur(field.key)}
                aria-invalid={!!error || !!invalid || undefined}
                className="h-11 rounded-[14px] px-3.5 text-start text-[15px] md:text-[15px]"
              />
              {error ? (
                <p className="text-sm text-destructive">{t("businessNameMissing")}</p>
              ) : (
                <FieldError message={invalid} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
