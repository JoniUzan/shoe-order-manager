"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema, type CustomerInput } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/components/textarea";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useRouter } from "@/i18n/navigation";
import { createCustomer, updateCustomer } from "@/lib/actions/customers";

const EMPTY: CustomerInput = {
  name: "",
  contactName: "",
  phone: "",
  address: "",
  notes: "",
};

export function CustomerForm({
  customerId,
  defaultValues,
}: {
  customerId?: string;
  defaultValues?: CustomerInput;
}) {
  const t = useTranslations("customers");
  const tv = useTranslations("validation");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const form = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: defaultValues ?? EMPTY,
  });

  function onSubmit(values: CustomerInput) {
    startTransition(async () => {
      const res = customerId
        ? await updateCustomer(customerId, values)
        : await createCustomer(values);
      if (res.ok) {
        toast.success(customerId ? t("updated") : t("created"));
        router.push(`/customers/${res.id}`);
        router.refresh();
      } else {
        toast.error(t("errorGeneric"));
      }
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex max-w-xl flex-col gap-5"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">{t("name")}</Label>
        <Input
          id="name"
          placeholder={t("namePlaceholder")}
          aria-invalid={!!form.formState.errors.name}
          {...form.register("name")}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">{tv("required")}</p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contactName">{t("contactName")}</Label>
          <Input id="contactName" {...form.register("contactName")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">{t("phone")}</Label>
          <Input id="phone" type="tel" dir="ltr" {...form.register("phone")} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="address">{t("address")}</Label>
        <Input id="address" {...form.register("address")} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">{t("notes")}</Label>
        <Textarea id="notes" rows={3} {...form.register("notes")} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {tc("save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => router.back()}
        >
          {tc("cancel")}
        </Button>
      </div>
    </form>
  );
}
