import { prisma } from "@repo/db";
import { Card } from "@repo/ui/components/card";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { NoiseWash } from "@/components/ui/noise-wash";
import { Link } from "@/i18n/navigation";
import { getSession } from "@/lib/auth";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Already signed in with a still-valid user → go to the dashboard.
  // (Verify the row exists so a stale cached session shows the form instead of looping.)
  const session = await getSession();
  if (session?.user?.id) {
    const exists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });
    if (exists) {
      redirect(`/${locale}`);
    }
  }

  const [t, tApp] = await Promise.all([
    getTranslations({ locale, namespace: "auth" }),
    getTranslations({ locale, namespace: "app" }),
  ]);

  // The same page as sign-up: the wash, the app's name, one card.
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden p-4">
      <NoiseWash />
      <div className="absolute start-8 top-7 text-base font-medium tracking-tight">
        {tApp("name")}
      </div>
      <Card className="relative w-full max-w-sm gap-5 rounded-3xl px-6 pt-7 pb-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-medium tracking-tight">
            {t("loginTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("loginSubtitle")}</p>
        </div>
        <LoginForm locale={locale} />
        <p className="text-center text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            {t("signUp")}
          </Link>
        </p>
      </Card>
    </main>
  );
}
