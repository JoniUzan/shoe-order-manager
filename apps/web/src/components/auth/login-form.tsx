"use client";

import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { authenticate, type LoginState } from "@/lib/actions/auth-actions";

/**
 * Email and password, drawn like the sign-up form. The email is controlled
 * so a wrong password doesn't clear it (React resets uncontrolled fields
 * after a form action).
 */
export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    authenticate,
    undefined,
  );
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const box = "h-11 rounded-xl px-3.5 text-[15px] md:text-[15px]";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />

      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            dir="ltr"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${box} text-start`}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">{t("password")}</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
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
        </div>
      </div>

      {state && (
        <p role="alert" className="text-sm text-destructive">
          {state === "invalid" ? t("invalidCredentials") : t("genericError")}
        </p>
      )}

      <Button type="submit" disabled={pending} className="h-11 rounded-xl text-[15px]">
        {pending ? t("signingIn") : t("signIn")}
      </Button>
    </form>
  );
}
