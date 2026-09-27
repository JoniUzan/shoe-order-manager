"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { emailChangeSchema, type EmailChangeInput } from "@repo/domain";
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

import { changeEmail } from "@/lib/actions/settings";

import { FieldError } from "./field-error";

/** The email is the login, so a new one is confirmed with the password. */
export function EmailDialog({
  open,
  onOpenChange,
  currentEmail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
}) {
  const t = useTranslations("settings");
  const [pending, setPending] = useState(false);
  const form = useForm<EmailChangeInput>({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: { email: currentEmail, currentPassword: "" },
  });
  const { errors } = form.formState;

  // Opened from outside (the row's Change button), so Radix never reports the
  // opening: start each open fresh — the current email, no password, no
  // errors left from last time.
  useEffect(() => {
    if (open) form.reset({ email: currentEmail, currentPassword: "" });
  }, [open, currentEmail, form]);

  async function onSubmit(values: EmailChangeInput) {
    setPending(true);
    const res = await changeEmail(values);
    setPending(false);
    if (res.ok) {
      toast.success(t("emailSaved"));
      onOpenChange(false);
    } else if (res.error === "wrong_password") {
      form.setError("currentPassword", { message: "wrongPassword" });
    } else if (res.error === "email_taken") {
      form.setError("email", { message: "emailTaken" });
    } else {
      toast.error(t("errorGeneric"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{t("changeEmail")}</DialogTitle>
        </DialogHeader>
        <form
          id="change-email"
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email-new">{t("newEmail")}</Label>
            <Input
              id="email-new"
              type="email"
              autoComplete="email"
              dir="ltr"
              aria-invalid={!!errors.email}
              {...form.register("email")}
            />
            <FieldError message={errors.email?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email-password">{t("currentPassword")}</Label>
            <Input
              id="email-password"
              type="password"
              autoComplete="current-password"
              dir="ltr"
              aria-invalid={!!errors.currentPassword}
              {...form.register("currentPassword")}
            />
            <FieldError message={errors.currentPassword?.message} />
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
          <Button type="submit" form="change-email" disabled={pending}>
            {t("changeEmail")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
