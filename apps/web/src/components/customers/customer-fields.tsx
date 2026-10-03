"use client";

import type { CustomerInput } from "@repo/domain";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { cn } from "@repo/ui/lib/utils";
import { useTranslations } from "next-intl";
import type { UseFormReturn } from "react-hook-form";

import { roomy } from "@/components/step-form/roomy";
import { StepForm } from "@/components/step-form/step-form";

export const EMPTY_CUSTOMER: CustomerInput = {
  name: "",
  contactName: "",
  phone: "",
  address: "",
  notes: "",
};

/**
 * A Customer's fields in the stepped forms' look: the Customer form's page
 * and the order form's "New customer" sheet. Contact and phone sit side by
 * side when their container has room.
 */
export function CustomerFields({
  form,
  idPrefix = "",
}: {
  form: UseFormReturn<CustomerInput>;
  /** Keeps the ids unique when the fields sit beside another form's. */
  idPrefix?: string;
}) {
  const t = useTranslations("customers");
  const tv = useTranslations("validation");
  const id = (name: keyof CustomerInput) => `${idPrefix}${name}`;
  const nameError = form.formState.errors.name;

  return (
    <div className="flex flex-col gap-4.5">
      <StepForm.Field
        label={t("storeName")}
        htmlFor={id("name")}
        error={nameError ? tv("required") : undefined}
      >
        <Input
          id={id("name")}
          aria-invalid={!!nameError}
          className={roomy.field}
          {...form.register("name", {
            // Clear "required" as soon as it's fixed, not on the next save.
            onChange: () => {
              if (form.formState.errors.name) void form.trigger("name");
            },
          })}
        />
      </StepForm.Field>

      <div className="grid gap-4.5 @xl:grid-cols-2 @xl:gap-4">
        <StepForm.Field label={t("contactName")} htmlFor={id("contactName")}>
          <Input
            id={id("contactName")}
            className={roomy.field}
            {...form.register("contactName")}
          />
        </StepForm.Field>
        <StepForm.Field label={t("phone")} htmlFor={id("phone")}>
          <Input
            id={id("phone")}
            type="tel"
            dir="ltr"
            // Typed left to right, but lined up with the other fields.
            className={cn(roomy.field, "text-start rtl:text-right")}
            {...form.register("phone")}
          />
        </StepForm.Field>
      </div>

      <StepForm.Field label={t("address")} htmlFor={id("address")}>
        <Input
          id={id("address")}
          className={roomy.field}
          {...form.register("address")}
        />
      </StepForm.Field>

      <StepForm.Field label={t("notes")} htmlFor={id("notes")}>
        <Textarea
          id={id("notes")}
          rows={3}
          placeholder={t("optional")}
          className={cn(roomy.area, "resize-none")}
          {...form.register("notes")}
        />
      </StepForm.Field>
    </div>
  );
}
