"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema, type CustomerInput } from "@repo/domain";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { CustomerFields, EMPTY_CUSTOMER } from "@/components/customers/customer-fields";
import { StepForm, useStepForm } from "@/components/step-form/step-form";
import { useRouter } from "@/i18n/navigation";
import { createCustomer, updateCustomer } from "@/lib/actions/customers";

/** A Customer on one page: StepForm with no steps. */
export function CustomerForm({
  customerId,
  defaultValues,
}: {
  customerId?: string;
  defaultValues?: CustomerInput;
}) {
  const t = useTranslations("customers");
  const router = useRouter();
  const editing = customerId !== undefined;
  const [pending, setPending] = useState(false);

  const form = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: defaultValues ?? EMPTY_CUSTOMER,
  });
  const flow = useStepForm({ steps: [], editing });

  async function save(values: CustomerInput) {
    setPending(true);
    const res = customerId
      ? await updateCustomer(customerId, values)
      : await createCustomer(values);
    if (res.ok) {
      toast.success(customerId ? t("updated") : t("created"));
      router.push(`/customers/${res.id}`);
    } else {
      toast.error(t("errorGeneric"));
      setPending(false);
    }
  }

  return (
    <StepForm
      flow={flow}
      onSave={(e) => void form.handleSubmit(save)(e)}
      cancelHref={customerId ? `/customers/${customerId}` : "/customers"}
      dirty={form.formState.isDirty}
      pending={pending}
    >
      <StepForm.Header title={editing ? t("edit") : t("new")} />
      <StepForm.Pane>
        <StepForm.StepHeader
          illustration="store"
          title={editing ? t("edit") : t("new")}
          hint={editing ? t("editHint") : t("formHint")}
        />
        <CustomerFields form={form} />
      </StepForm.Pane>
      <StepForm.Actions saveLabel={t("saveCustomer")} />
    </StepForm>
  );
}
