"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  passwordChangeSchema,
  type PasswordChangeInput,
} from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { changePassword } from "@/lib/actions/settings";

import { FieldError } from "./field-error";

const EMPTY: PasswordChangeInput = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function PasswordForm() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [pending, setPending] = useState(false);

  const form = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: EMPTY,
  });
  const { errors } = form.formState;

  async function onSubmit(values: PasswordChangeInput) {
    setPending(true);
    const res = await changePassword(values);
    setPending(false);
    if (res.ok) {
      toast.success(t("passwordSaved"));
      form.reset(EMPTY);
    } else if (res.error === "wrong_password") {
      form.setError("currentPassword", { message: "wrongPassword" });
    } else {
      toast.error(t("errorGeneric"));
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-current-password">
          {t("currentPassword")}
        </Label>
        <Input
          id="settings-current-password"
          type="password"
          autoComplete="current-password"
          dir="ltr"
          aria-invalid={!!errors.currentPassword}
          {...form.register("currentPassword")}
        />
        <FieldError message={errors.currentPassword?.message} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-new-password">{t("newPassword")}</Label>
        <Input
          id="settings-new-password"
          type="password"
          autoComplete="new-password"
          dir="ltr"
          aria-invalid={!!errors.newPassword}
          {...form.register("newPassword")}
        />
        {errors.newPassword ? (
          <FieldError message={errors.newPassword.message} />
        ) : (
          <p className="text-sm text-muted-foreground">{t("passwordHelp")}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-confirm-password">
          {t("confirmPassword")}
        </Label>
        <Input
          id="settings-confirm-password"
          type="password"
          autoComplete="new-password"
          dir="ltr"
          aria-invalid={!!errors.confirmPassword}
          {...form.register("confirmPassword")}
        />
        <FieldError message={errors.confirmPassword?.message} />
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}
