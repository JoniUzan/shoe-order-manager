import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { cn } from "@repo/ui/lib/utils";
import { ChevronLeft, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { roomy } from "@/components/step-form/roomy";

import { SkeletonSection, vary } from "./skeleton-section";

/**
 * A form on its first step before the page's data arrives, for a form
 * route's `loading.tsx`, as drawn on the approved canvas. Everything the form
 * says is real: its title, the steps, the first step's title and hint, and
 * the buttons, disabled. Only the step's body is grey: a search and a list
 * of rows (picking a Customer), or fields. It takes the form's own
 * `data-slot`, so the app panel holds it to the window as it does the form.
 */
export function FormSkeleton({
  title,
  steps,
  stepTitle,
  hint,
  submitLabel,
  body = "fields",
}: {
  title: string;
  /** The step names; empty for a one-page form. */
  steps: string[];
  stepTitle: string;
  hint: string;
  /** Continue on a stepped form, Save on a one-page one. */
  submitLabel: string;
  /** A search over rows to pick from, or a column of fields. */
  body?: "list" | "fields";
}) {
  const t = useTranslations("common");
  const stepped = steps.length > 1;
  const stepOf = stepped
    ? t("stepOf", { current: 1, total: steps.length, name: steps[0]! })
    : null;

  return (
    <div className="flex flex-1 flex-col md:min-h-0">
      <div
        data-slot="step-form"
        className="flex flex-1 flex-col gap-8 pb-28 md:min-h-0 md:pb-0"
      >
        {/* A computer: the title, the steps, ✕. */}
        <header className="hidden items-center justify-between gap-4 md:flex">
          <div className="flex items-center gap-7">
            <h2 className="text-lg font-semibold">{title}</h2>
            {stepped && (
              <ol className="flex items-center gap-2.5 text-sm">
                {steps.map((step, i) => (
                  <li
                    key={step}
                    className={cn(
                      "flex items-center gap-2.5 text-muted-foreground",
                      i === 0 && "font-semibold text-foreground",
                    )}
                  >
                    {i > 0 && (
                      <span aria-hidden className="h-[1.5px] w-9 bg-foreground/20" />
                    )}
                    {step}
                  </li>
                ))}
              </ol>
            )}
          </div>
          <Button variant="ghost" size="icon" disabled aria-label={t("close")}>
            <XIcon className="size-4.5" aria-hidden />
          </Button>
        </header>

        {/* A phone: ✕, the title centred, the progress and "step 1 of 4". */}
        <header className="flex flex-col gap-3.5 md:hidden">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              disabled
              aria-label={t("close")}
              className="size-11 rounded-[0.875rem]"
            >
              <XIcon className="size-5.5" aria-hidden />
            </Button>
            <h2 className="font-semibold">{title}</h2>
            <span className="size-11" aria-hidden />
          </div>
          {stepped && (
            <>
              <div className="flex gap-1.5" aria-hidden>
                {steps.map((step, i) => (
                  <span
                    key={step}
                    className={cn(
                      "h-1 flex-1 rounded-full",
                      i === 0 ? "bg-foreground" : "bg-foreground/20",
                    )}
                  />
                ))}
              </div>
              <p className="text-[0.8125rem] text-muted-foreground">{stepOf}</p>
            </>
          )}
        </header>

        <div className="flex flex-col gap-1.5">
          <h3 className="text-3xl font-semibold tracking-[-0.01em] md:text-[2.125rem]">
            {stepTitle}
          </h3>
          <p className="text-[15px] text-muted-foreground">{hint}</p>
        </div>

        <SkeletonSection className="flex w-full max-w-[35rem] flex-col gap-3">
          {body === "list" ? (
            <>
              <Skeleton className="h-11 rounded-[14px]" />
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={i}
                  className="flex h-14 items-center gap-3 rounded-2xl border px-3.5"
                >
                  <Skeleton className="size-8 shrink-0 rounded-full" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3" style={{ width: vary(i, 170) }} />
                    <Skeleton className="h-2.5" style={{ width: vary(i + 4, 104) }} />
                  </div>
                </div>
              ))}
            </>
          ) : (
            Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex flex-col gap-1.5 pb-2">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-12 rounded-2xl" />
              </div>
            ))
          )}
        </SkeletonSection>

        <footer className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-2 border-t bg-background px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:static md:mt-auto md:bg-transparent md:px-0 md:pt-4 md:pb-0">
          {stepOf && (
            <p className="me-auto hidden text-sm text-muted-foreground md:block">{stepOf}</p>
          )}
          <span className="flex-1 md:hidden" aria-hidden />
          {stepped && (
            <Button type="button" variant="ghost" disabled className={roomy.button}>
              {t("back")}
            </Button>
          )}
          <Button
            type="button"
            disabled
            className={cn(roomy.button, "flex-1 md:min-w-40 md:flex-none")}
          >
            {submitLabel}
            {stepped && <ChevronLeft className="size-4.5 ltr:rotate-180" aria-hidden />}
          </Button>
        </footer>
      </div>
    </div>
  );
}
