"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type ProfileInput } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { updateProfile } from "@/lib/actions/settings";

import { FieldError } from "./field-error";

export function ProfileForm({
  defaultValues,
}: {
  defaultValues: { name: string; email: string };
}) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [pending, setPending] = useState(false);
  const [savedEmail, setSavedEmail] = useState(defaultValues.email);

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { ...defaultValues, currentPassword: "" },
  });
  const { errors } = form.formState;
  const emailChanged =
    form.watch("email").trim().toLowerCase() !== savedEmail.toLowerCase();

  async function onSubmit(values: ProfileInput) {
    setPending(true);
    const res = await updateProfile(values);
    setPending(false);
    if (res.ok) {
      toast.success(t("profileSaved"));
      const email = values.email.trim().toLowerCase();
      setSavedEmail(email);
      form.reset({ name: values.name.trim(), email, currentPassword: "" });
    } else if (res.error === "wrong_password") {
      form.setError("currentPassword", { message: "wrongPassword" });
    } else if (res.error === "email_taken") {
      form.setError("email", { message: "emailTaken" });
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
        <Label htmlFor="settings-name">{t("name")}</Label>
        <Input
          id="settings-name"
          autoComplete="name"
          aria-invalid={!!errors.name}
          {...form.register("name")}
        />
        <FieldError message={errors.name?.message} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="settings-email">{t("email")}</Label>
        <Input
          id="settings-email"
          type="email"
          autoComplete="email"
          dir="ltr"
          aria-invalid={!!errors.email}
          {...form.register("email")}
        />
        <FieldError message={errors.email?.message} />
      </div>

      {emailChanged && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-email-password">
            {t("currentPassword")}
          </Label>
          <Input
            id="settings-email-password"
            type="password"
            autoComplete="current-password"
            dir="ltr"
            aria-invalid={!!errors.currentPassword}
            {...form.register("currentPassword")}
          />
          {errors.currentPassword ? (
            <FieldError message={errors.currentPassword.message} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("currentPasswordForEmail")}
            </p>
          )}
        </div>
      )}

      <div>
        <Button type="submit" disabled={pending}>
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}
