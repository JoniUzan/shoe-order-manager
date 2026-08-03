"use client";

import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { authenticate, type LoginState } from "@/lib/actions/auth-actions";

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    authenticate,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          dir="ltr"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          dir="ltr"
        />
      </div>

      {state === "invalid" && (
        <p className="text-sm text-destructive">{t("invalidCredentials")}</p>
      )}
      {state === "error" && (
        <p className="text-sm text-destructive">{t("genericError")}</p>
      )}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? t("signingIn") : t("signIn")}
      </Button>
    </form>
  );
}
