import { prisma } from "@repo/db";
import { Card } from "@repo/ui/components/card";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { SignupForm } from "@/components/auth/signup-form";
import { NoiseWash } from "@/components/ui/noise-wash";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";

/** Open to anyone: each new User is its own, empty business. */
export default async function SignupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Already signed in (and the user still exists) → the app. Same check as
  // the login page, so a stale JWT shows the form instead of looping.
  const session = await auth();
  if (session?.user?.id) {
    const exists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });
    if (exists) redirect(`/${locale}`);
  }

  const [t, tApp] = await Promise.all([
    getTranslations({ locale, namespace: "auth" }),
    getTranslations({ locale, namespace: "app" }),
  ]);

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden p-4">
      <NoiseWash />
      <div className="absolute start-8 top-7 text-base font-medium tracking-tight">
        {tApp("name")}
      </div>
      <Card className="relative w-full max-w-sm gap-5 rounded-3xl px-6 pt-7 pb-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-medium tracking-tight">
            {t("signupTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("signupSubtitle")}</p>
        </div>
        <SignupForm locale={locale} />
        <p className="text-center text-sm text-muted-foreground">
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t("signIn")}
          </Link>
        </p>
      </Card>
    </main>
  );
}
