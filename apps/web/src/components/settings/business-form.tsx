"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { businessSchema, type BusinessInput } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { updateBusiness } from "@/lib/actions/settings";

import { FieldError } from "./field-error";

export function BusinessForm({
  defaultValues,
}: {
  defaultValues: BusinessInput;
}) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [pending, setPending] = useState(false);

  const form = useForm<BusinessInput>({
    resolver: zodResolver(businessSchema),
    defaultValues,
  });
  const { errors } = form.formState;

  async function onSubmit(values: BusinessInput) {
    setPending(true);
    const res = await updateBusiness(values);
    setPending(false);
    if (res.ok) {
      toast.success(t("businessSaved"));
      form.reset(values);
    } else {
      toast.error(t("errorGeneric"));
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
    >
      <p className="text-sm text-muted-foreground">{t("businessHelp")}</p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-business-name">{t("businessName")}</Label>
        <Input
          id="settings-business-name"
          autoComplete="organization"
          aria-invalid={!!errors.businessName}
          {...form.register("businessName")}
        />
        <FieldError message={errors.businessName?.message} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-business-phone">{t("businessPhone")}</Label>
          <Input
            id="settings-business-phone"
            type="tel"
            autoComplete="tel"
            dir="ltr"
            aria-invalid={!!errors.businessPhone}
            {...form.register("businessPhone")}
          />
          <FieldError message={errors.businessPhone?.message} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-business-tax-id">
            {t("businessTaxId")}
          </Label>
          <Input
            id="settings-business-tax-id"
            dir="ltr"
            inputMode="numeric"
            aria-invalid={!!errors.businessTaxId}
            {...form.register("businessTaxId")}
          />
          <FieldError message={errors.businessTaxId?.message} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-business-address">
          {t("businessAddress")}
        </Label>
        <Input
          id="settings-business-address"
          autoComplete="street-address"
          aria-invalid={!!errors.businessAddress}
          {...form.register("businessAddress")}
        />
        <FieldError message={errors.businessAddress?.message} />
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}
