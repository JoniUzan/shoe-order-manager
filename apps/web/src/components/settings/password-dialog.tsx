"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  passwordChangeSchema,
  type PasswordChangeInput,
} from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { changePassword } from "@/lib/actions/settings";

import { FieldError } from "./field-error";

const EMPTY: PasswordChangeInput = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

/** Opens on top of the settings — changing how you sign in is deliberate. */
export function PasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("settings");
  const [pending, setPending] = useState(false);
  const form = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: EMPTY,
  });
  const { errors } = form.formState;

  // Opened from outside, so start each open fresh (no values, no errors).
  useEffect(() => {
    if (open) form.reset(EMPTY);
  }, [open, form]);

  async function onSubmit(values: PasswordChangeInput) {
    setPending(true);
    let res;
    try {
      res = await changePassword(values);
    } finally {
      setPending(false);
    }
    if (res.ok) {
      toast.success(t("passwordSaved"));
      onOpenChange(false);
    } else if (res.error === "wrong_password") {
      form.setError("currentPassword", { message: "wrongPassword" });
    } else {
      toast.error(t("errorGeneric"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{t("changePassword")}</DialogTitle>
        </DialogHeader>
        <form
          id="change-password"
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pw-current">{t("currentPassword")}</Label>
            <Input
              id="pw-current"
              type="password"
              autoComplete="current-password"
              dir="ltr"
              aria-invalid={!!errors.currentPassword}
              {...form.register("currentPassword")}
            />
            <FieldError message={errors.currentPassword?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pw-new">{t("newPassword")}</Label>
            <Input
              id="pw-new"
              type="password"
              autoComplete="new-password"
              dir="ltr"
              aria-invalid={!!errors.newPassword}
              {...form.register("newPassword")}
            />
            {errors.newPassword ? (
              <FieldError message={errors.newPassword.message} />
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("passwordHelp")}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pw-confirm">{t("confirmPassword")}</Label>
            <Input
              id="pw-confirm"
              type="password"
              autoComplete="new-password"
              dir="ltr"
              aria-invalid={!!errors.confirmPassword}
              {...form.register("confirmPassword")}
            />
            <FieldError message={errors.confirmPassword?.message} />
          </div>
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {t("cancel")}
          </Button>
          <Button type="submit" form="change-password" loading={pending}>
            {t("changePassword")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
