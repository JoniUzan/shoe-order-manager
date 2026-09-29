"use client";

import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { FieldError } from "@/components/settings/field-error";
import { signUp, type SignupState } from "@/lib/actions/signup";

/**
 * Name, email and one password field (with show/hide, no confirm field).
 * The inputs are controlled so a server-side error doesn't clear what was
 * typed (React resets uncontrolled fields after a form action).
 */
export function SignupForm({ locale }: { locale: string }) {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState<SignupState, FormData>(
    signUp,
    undefined,
  );
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const errors = state?.fieldErrors ?? {};

  const bind = (field: keyof typeof values) => ({
    id: `signup-${field}`,
    name: field,
    value: values[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value })),
    "aria-invalid": !!errors[field] || undefined,
  });
  const box = "h-11 rounded-xl px-3.5 text-[15px] md:text-[15px]";

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />

      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-name">{t("fullName")}</Label>
          <Input
            {...bind("name")}
            type="text"
            autoComplete="name"
            placeholder={t("namePlaceholder")}
            className={box}
          />
          <FieldError message={errors.name} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-email">{t("email")}</Label>
          <Input
            {...bind("email")}
            type="email"
            autoComplete="email"
            dir="ltr"
            placeholder="name@example.com"
            className={`${box} text-start`}
          />
          <FieldError message={errors.email} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-password">{t("password")}</Label>
          <div className="relative">
            <Input
              {...bind("password")}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              // Not dir="ltr": the eye button sits on the page's end side,
              // and the padding that clears it must be on that side too.
              className={`${box} pe-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
              aria-pressed={showPassword}
              className="absolute end-0.5 top-0.5 grid size-10 place-items-center rounded-[10px] text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-[18px]"
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>
          {errors.password ? (
            <FieldError message={errors.password} />
          ) : (
            <p className="text-[13px] text-muted-foreground">
              {t("passwordHint")}
            </p>
          )}
        </div>
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error === "rate_limited" ? t("rateLimited") : t("genericError")}
        </p>
      )}

      <Button type="submit" disabled={pending} className="h-11 rounded-xl text-[15px]">
        {pending ? t("creatingAccount") : t("createAccount")}
      </Button>
    </form>
  );
}
