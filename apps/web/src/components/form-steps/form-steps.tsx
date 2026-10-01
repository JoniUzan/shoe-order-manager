"use client";

import { cn } from "@repo/ui/lib/utils";
import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Illustration, type IllustrationName } from "@/components/ui/illustration";

/**
 * Where a stepped form is. On a computer, the numbered list of steps, each one a
 * button; on a phone, a segmented progress bar and "step 2 of 3".
 * `reachable(i)` decides which steps can be jumped to: finished ones while
 * creating, all of them while editing.
 */
export function StepBar({
  steps,
  current,
  reachable,
  onSelect,
}: {
  steps: readonly string[];
  current: number;
  reachable: (index: number) => boolean;
  onSelect: (index: number) => void;
}) {
  const t = useTranslations("common");

  return (
    <nav aria-label={t("steps")}>
      <ol className="hidden items-center gap-2.5 md:flex">
        {steps.map((label, i) => {
          const done = i < current;
          const now = i === current;
          return (
            <li key={label} className="flex items-center gap-2.5">
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn("h-px w-9", i <= current ? "bg-foreground" : "bg-border")}
                />
              )}
              <button
                type="button"
                disabled={!now && !reachable(i)}
                aria-current={now ? "step" : undefined}
                onClick={() => onSelect(i)}
                className={cn(
                  "flex items-center gap-2 rounded-md text-sm text-muted-foreground",
                  "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
                  "enabled:cursor-pointer disabled:cursor-default",
                  (done || now) && "text-foreground",
                  now && "font-semibold",
                )}
              >
                <span
                  className={cn(
                    "flex size-6.5 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
                    done && "border-foreground bg-foreground text-background",
                    now && "border-2 border-foreground",
                    !done && !now && "border-foreground/20",
                  )}
                >
                  {done ? <CheckIcon className="size-3.5" aria-hidden /> : i + 1}
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-2 md:hidden">
        <div className="flex gap-1.5" aria-hidden>
          {steps.map((label, i) => (
            <span
              key={label}
              className={cn(
                "h-1 flex-1 rounded-full",
                i <= current ? "bg-foreground" : "bg-foreground/15",
              )}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground" aria-current="step">
          {t("stepOf", { current: current + 1, total: steps.length, name: steps[current] ?? "" })}
        </p>
      </div>
    </nav>
  );
}

/** A step's title, with its illustration and a one-line hint. */
export function StepHeader({
  illustration,
  title,
  hint,
}: {
  illustration: IllustrationName;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-5">
      <Illustration name={illustration} />
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="text-3xl font-semibold tracking-tight md:text-[2.125rem]">{title}</h3>
        <p className="text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}
