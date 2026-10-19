"use client";

import { Button } from "@repo/ui/components/button";
import { useTranslations } from "next-intl";
import { Check, RotateCcw } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { useRouter } from "@/i18n/navigation";
import { setOrderStatus } from "@/lib/actions/orders";

export function OrderStatusToggle({
  id,
  statusCode,
}: {
  id: string;
  statusCode: string;
}) {
  const t = useTranslations("orders");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isDone = statusCode === "done";

  function toggle() {
    startTransition(async () => {
      const res = await setOrderStatus(id, isDone ? "not_done" : "done");
      if (res.ok) {
        toast.success(t("statusUpdated"));
        router.refresh();
      } else {
        toast.error(t("errorGeneric"));
      }
    });
  }

  return (
    <Button
      type="button"
      variant={isDone ? "outline" : "default"}
      size="sm"
      loading={pending}
      onClick={toggle}
    >
      {isDone ? (
        <>
          <RotateCcw className="size-4" />
          {t("markNotDone")}
        </>
      ) : (
        <>
          <Check className="size-4" />
          {t("markDone")}
        </>
      )}
    </Button>
  );
}
