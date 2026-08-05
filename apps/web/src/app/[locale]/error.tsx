"use client";

import { Button } from "@repo/ui/components/button";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <AlertTriangle className="size-12 text-muted-foreground" />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("genericTitle")}
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {t("genericBody")}
        </p>
      </div>
      <Button onClick={reset}>{t("retry")}</Button>
    </div>
  );
}
