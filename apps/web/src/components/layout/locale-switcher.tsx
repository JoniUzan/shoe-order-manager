"use client";

import { cn } from "@repo/ui/lib/utils";
import { useLocale } from "next-intl";
import { useTransition } from "react";

import { routing } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";

const LABELS: Record<string, string> = { he: "עב", en: "EN" };

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function switchTo(next: string) {
    if (next === locale) return;
    startTransition(() => {
      // Preserve the current path, swap the locale segment.
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div className="inline-flex items-center rounded-md border border-border p-0.5">
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          disabled={pending}
          className={cn(
            "rounded px-2 py-1 text-xs font-medium transition-colors",
            l === locale
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {LABELS[l] ?? l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
