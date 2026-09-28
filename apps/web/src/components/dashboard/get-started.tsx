import type { AvatarCode } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { getTranslations } from "next-intl/server";

import { avatarSrc } from "@/components/ui/orb";
import { Link } from "@/i18n/navigation";

/**
 * Home's nudge while the business is still empty (no customers, no shoe
 * models) — where a new User lands after onboarding.
 */
export async function GetStarted({
  locale,
  name,
  avatar,
}: {
  locale: string;
  name: string;
  avatar: AvatarCode;
}) {
  const t = await getTranslations({ locale, namespace: "dashboard" });

  return (
    <Card className="items-center gap-3.5 px-6 py-7 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- a small local image */}
      <img src={avatarSrc(avatar)} alt="" className="size-18 rounded-full" />
      <h2 className="text-[22px] font-medium">
        {name ? t("getStartedTitleNamed", { name }) : t("getStartedTitle")}
      </h2>
      <p className="text-sm text-muted-foreground">{t("getStartedSubtitle")}</p>
      <div className="mt-1 flex flex-wrap justify-center gap-2.5">
        <Button asChild className="rounded-[14px]">
          <Link href="/customers/new">{t("addCustomer")}</Link>
        </Button>
        <Button asChild variant="secondary" className="rounded-[14px]">
          <Link href="/catalog/new">{t("addShoeModel")}</Link>
        </Button>
      </div>
    </Card>
  );
}
