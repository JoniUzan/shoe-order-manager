"use client";

import {
  businessSchema,
  type AvatarCode,
  type BusinessInput,
  type LocaleCode,
} from "@repo/domain";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Ref } from "react";

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

export type BusinessValues = Required<{
  [K in keyof BusinessInput]: string;
}>;

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
      <OrderHeaderPreview values={values} phone={phone} />

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

/**
 * The top of a printed order, drawn as it will come out: always on paper
 * (light), whatever the app's theme.
 */
function OrderHeaderPreview({
  values,
  phone,
}: {
  values: BusinessValues;
  phone: boolean;
}) {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const name = values.businessName.trim();
  const contact = [values.businessPhone, values.businessAddress]
    .map((v) => v.trim())
    .filter(Boolean);
  const today = new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  return (
    <div className={cn("flex flex-col gap-2", phone ? "w-full" : "w-[380px]")}>
      <span className="text-[13px] text-muted-foreground">{t("previewLabel")}</span>
      <div
        aria-hidden
        className={cn(
          "flex flex-col gap-2.5 rounded-[18px] border border-[#091717]/10 bg-[#fbfaf4] text-[#091717] shadow-[0_4px_12px_rgba(0,0,0,.08),0_18px_40px_rgba(0,0,0,.06)]",
          phone ? "px-4.5 py-4" : "px-6.5 py-6",
        )}
      >
        <div className="flex min-w-0 flex-col gap-1">
          <span
            className={cn(
              "truncate font-semibold tracking-tight",
              phone ? "text-[19px]" : "text-2xl",
              !name && "text-[#091717]/30",
            )}
          >
            {name || t("previewNamePlaceholder")}
          </span>
          <span className="truncate text-[13px] text-[#091717]/65">
            {contact.length ? contact.join(" · ") : "—"}
          </span>
          {!phone && values.businessTaxId.trim() && (
            <span className="text-[13px] text-[#091717]/65">
              {t("previewTaxId", { id: values.businessTaxId.trim() })}
            </span>
          )}
        </div>
        {!phone && (
          <>
            <div className="my-1.5 h-px bg-[#091717]/10" />
            <div className="flex justify-between text-sm">
              <span className="font-semibold">{t("previewOrder")}</span>
              <span className="text-[#091717]/65 tabular-nums">{today}</span>
            </div>
            <div className="h-2 w-[55%] rounded bg-[#091717]/7" />
            <div className="mt-2 mb-0.5 h-px bg-[#091717]/10" />
            <div className="grid grid-cols-4 gap-2.5">
              {Array.from({ length: 12 }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-2 rounded",
                    i < 4 ? "bg-[#091717]/12" : "bg-[#091717]/6",
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
