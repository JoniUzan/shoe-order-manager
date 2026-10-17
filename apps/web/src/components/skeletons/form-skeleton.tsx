import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { cn } from "@repo/ui/lib/utils";
import { ChevronLeft } from "lucide-react";

import { roomy } from "@/components/step-form/roomy";
import { Illustration, type IllustrationName } from "@/components/ui/illustration";

import { SkeletonSection } from "./skeleton-section";

/**
 * A StepForm on its first step before the page's data arrives, for a form
 * route's `loading.tsx`. Everything the form says is real: its title, the
 * steps, the first step's title and hint, a disabled Continue. Only the
 * fields are grey. It takes the form's own `data-slot`, so the app panel
 * holds it to the window as it does the form.
 */
export function FormSkeleton({
  title,
  steps,
  illustration,
  stepTitle,
  hint,
  submitLabel,
  fields = 4,
}: {
  title: string;
  /** The step names; empty for a one-page form. */
  steps: string[];
  illustration: IllustrationName;
  stepTitle: string;
  hint: string;
  /** Continue on a stepped form, Save on a one-page one. */
  submitLabel: string;
  fields?: number;
}) {
  return (
    <div className="flex flex-1 flex-col @container md:min-h-0">
      <div
        data-slot="step-form"
        className={cn(
          "grid flex-1 grid-cols-1 grid-rows-[auto_1fr_auto] gap-x-6 gap-y-5 pb-28 md:gap-y-6 md:pb-0",
          "md:min-h-0 md:grid-rows-[auto_minmax(0,1fr)_auto]",
          steps.length === 0 &&
            "md:mx-auto md:w-full md:max-w-[45rem] md:grid-rows-[auto_minmax(0,auto)_auto] md:content-start",
        )}
      >
        <header className="flex flex-col gap-3.5 md:flex-row md:items-center md:gap-7">
          <h2 className="font-semibold md:text-lg">{title}</h2>
          {steps.length > 1 && (
            <>
              <ol className="hidden items-center gap-2.5 md:flex">
                {steps.map((step, i) => (
                  <li
                    key={step}
                    className={cn(
                      "flex items-center gap-2.5 text-sm text-muted-foreground",
                      i === 0 && "font-semibold text-foreground",
                    )}
                  >
                    {i > 0 && <span aria-hidden className="h-[1.5px] w-9 bg-foreground/20" />}
                    <span
                      className={cn(
                        "flex size-6.5 items-center justify-center rounded-full border-[1.5px] border-foreground/20 text-[0.8125rem] font-semibold tabular-nums",
                        i === 0 && "border-2 border-foreground",
                      )}
                    >
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <div className="flex gap-1.5 md:hidden" aria-hidden>
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
            </>
          )}
        </header>

        <section
          className={cn(
            "flex min-w-0 flex-col",
            "md:min-h-0 md:rounded-card md:bg-card md:py-6",
            "md:shadow-[0_0_0_0.5px_var(--hairline),var(--shadow-card)]",
          )}
        >
          <div className="flex flex-col gap-5 md:gap-7 md:px-10 md:py-3">
            <div className="flex items-center gap-5">
              <Illustration name={illustration} />
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="text-3xl font-semibold tracking-[-0.01em] md:text-[2.125rem]">
                  {stepTitle}
                </h3>
                <p className="text-muted-foreground">{hint}</p>
              </div>
            </div>
            <SkeletonSection className="flex flex-col gap-5">
              {Array.from({ length: fields }, (_, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-12 rounded-2xl" />
                </div>
              ))}
            </SkeletonSection>
          </div>
        </section>

        <footer className="fixed inset-x-0 bottom-0 z-20 flex gap-2.5 border-t bg-background px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:static md:justify-end md:gap-3 md:border-0 md:bg-transparent md:p-0">
          <Button
            type="button"
            disabled
            className={cn(roomy.button, "flex-1 md:min-w-40 md:flex-none")}
          >
            {submitLabel}
            {steps.length > 1 && (
              <ChevronLeft className="size-4.5 ltr:rotate-180" aria-hidden />
            )}
          </Button>
        </footer>
      </div>
    </div>
  );
}
