import { Button } from "@repo/ui/components/button";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { FileQuestionMark } from "lucide-react";
import { headers } from "next/headers";

import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

// Rendered by `notFound()` deep in the tree, this page does not receive the
// `[locale]` param and next-intl's request locale isn't established here — so we
// read the locale from the header next-intl's middleware sets and pass it
// explicitly to both the translations and the locale-aware Link.
export default async function NotFound() {
  const requested = (await headers()).get("X-NEXT-INTL-LOCALE");
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "errors" });

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <FileQuestionMark className="size-12 text-muted-foreground" />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("notFoundTitle")}
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {t("notFoundBody")}
        </p>
      </div>
      <Button asChild>
        <Link href="/" locale={locale}>
          {t("notFoundHome")}
        </Link>
      </Button>
    </div>
  );
}
