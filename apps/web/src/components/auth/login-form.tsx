"use client";

import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

type LoginError = "invalid" | "rateLimited" | "error";

/**
 * Email and password, drawn like the sign-up form. Posts to Better Auth's
 * sign-in endpoint (rate-limited there), then lands in the account's saved
 * language, whichever one the login page was in.
 */
export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState<LoginError | null>(null);
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const box = "h-11 rounded-xl px-3.5 text-[15px] md:text-[15px]";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password"));
    setPending(true);
    setError(null);
    const { data, error } = await authClient.signIn.email({ email, password });
    if (error) {
      setPending(false);
      setError(
        error.status === 401 ? "invalid" : error.status === 429 ? "rateLimited" : "error",
      );
      return;
    }
    // Stays pending through the navigation.
    router.replace("/", { locale: data.user.locale ?? locale });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">

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

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error === "invalid"
            ? t("invalidCredentials")
            : error === "rateLimited"
              ? t("signInRateLimited")
              : t("genericError")}
        </p>
      )}

      <Button
        type="submit"
        loading={pending}
        loadingLabel={t("signingIn")}
        className="h-11 rounded-xl text-[15px]"
      >
        {t("signIn")}
      </Button>
    </form>
  );
}
