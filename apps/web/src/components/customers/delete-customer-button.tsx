"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog";
import { Button } from "@repo/ui/components/button";
import { useTranslations } from "next-intl";
import { Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useRouter } from "@/i18n/navigation";
import { deleteCustomer } from "@/lib/actions/customers";

export function DeleteCustomerButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const t = useTranslations("customers");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onConfirm() {
    setPending(true);
    const res = await deleteCustomer(id);
    if (res.ok) {
      toast.success(t("deleted"));
      router.push("/customers");
    } else if (res.error === "has_orders") {
      toast.error(t("errorHasOrders"));
      setPending(false);
    } else {
      toast.error(t("errorGeneric"));
      setPending(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trash className="size-4" />
          {tc("delete")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("deleteDescription", { name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {tc("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            loading={pending}
            variant="destructive"
          >
            {tc("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
