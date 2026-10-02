"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { CheckIcon, ChevronLeft, ChevronRight, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  Illustration,
  type IllustrationName,
} from "@/components/ui/illustration";
import { useRouter } from "@/i18n/navigation";

/**
 * A slight squeeze on press that confirms the interface heard it: never when
 * disabled, not with reduced motion. Exact properties, not `transition: all`
 * (the shared Button's), and `scale` because that's what Tailwind's scale-*
 * sets.
 */
const PRESS = cn(
  "transition-[color,background-color,box-shadow,scale] duration-150 ease-out-quint",
  "enabled:active:scale-[0.97] motion-reduce:enabled:active:scale-100",
);

/**
 * The roomier controls of the stepped forms: 48px fields with a 16px corner
 * and 16px text, buttons 44px on a computer and 52px on a phone. Applied here
 * rather than in `@repo/ui`, so the rest of the app keeps its denser controls.
 */
export const roomy = {
  field: cn(
    "h-12 rounded-2xl px-3.5 text-base shadow-none md:text-base",
    // No spinner arrows: they crowd the small pair boxes and nobody steps a
    // price by 0.01.
    "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
  ),
  area: "min-h-24 rounded-2xl px-3.5 py-3 text-base shadow-none md:text-base",
  label: "text-[0.8125rem] font-medium text-muted-foreground",
  button: cn(
    "h-13 rounded-2xl px-5 text-base md:h-11 md:text-[0.9375rem]",
    PRESS,
  ),
  /** Press feedback for anything else pressable in these forms. */
  press: PRESS,
  /**
   * A line that appears, like a field's error: eases in from just above
   * (@starting-style, so it plays only when the line is inserted). Reduced
   * motion keeps the fade.
   */
  appear: cn(
    "transition-[opacity,translate] duration-150 ease-out-quint",
    "starting:opacity-0 motion-safe:starting:-translate-y-1",
  ),
  /** A secondary button: a raised puck rather than an outline. */
  raised: cn(
    "border-0 bg-card shadow-[var(--shadow-raised)] hover:bg-accent dark:bg-card dark:hover:bg-accent",
    // Disabled, a puck on a card would vanish: keep its outline instead.
    "disabled:shadow-none disabled:ring-1 disabled:ring-input",
  ),
};

export interface Step {
  label: string;
}

/**
 * A form in steps, inside the app's sidebar layout. One header row holds the
 * form's title, where it is (numbered steps on a computer, a progress bar and
 * "step 2 of 3" on a phone) and "✕ Cancel". The step itself sits on a raised
 * card with the `preview` card beside it on a wide screen. `actions` sit right
 * under the step on a computer and in a fixed bottom bar on a phone.
 *
 * `reachable(i)` decides which steps the bar can jump to: finished ones while
 * creating, all of them while editing. Cancel asks first when `dirty`.
 */
export function StepFlow({
  title,
  steps,
  current,
  reachable,
  onSelect,
  cancelHref,
  dirty,
  preview,
  actions,
  children,
}: {
  title: string;
  steps: readonly Step[];
  current: number;
  reachable: (index: number) => boolean;
  onSelect: (index: number) => void;
  cancelHref: string;
  dirty: boolean;
  preview?: ReactNode;
  actions: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations("common");
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const sheetRef = useRef<HTMLElement>(null);
  const firstStep = useRef(true);
  // Which way the last step change went, so the new step can come in from
  // that side. Null until the first change: the page itself doesn't animate.
  const [shown, setShown] = useState(current);
  const [motion, setMotion] = useState<"forward" | "back" | null>(null);
  if (shown !== current) {
    setShown(current);
    setMotion(current > shown ? "forward" : "back");
  }

  // A new step starts at its title, for the eye and for a screen reader.
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    sheetRef.current?.querySelector<HTMLElement>("[data-step-title]")?.focus();
  }, [current]);

  function cancel() {
    if (dirty) setConfirming(true);
    else router.push(cancelHref);
  }

  return (
    // Fills the content panel's height, so on a computer the step's card
    // reaches down to its buttons however short the step is.
    <div className="flex flex-1 flex-col gap-5 md:gap-6">
      <header className="flex flex-col gap-3.5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between md:justify-start md:gap-7">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={cancel}
            aria-label={t("cancel")}
            className="size-11 rounded-[0.875rem] md:hidden"
          >
            <XIcon className="size-5.5" aria-hidden />
          </Button>
          {/* The page's h1 is the app header's section name. */}
          <h2 className="font-semibold md:text-lg">{title}</h2>
          <span className="size-11 md:hidden" aria-hidden />
          <StepList
            steps={steps}
            current={current}
            reachable={reachable}
            onSelect={onSelect}
          />
        </div>
        <StepProgress steps={steps} current={current} />
        <Button
          type="button"
          variant="ghost"
          onClick={cancel}
          className={cn(roomy.button, "hidden md:inline-flex")}
        >
          <XIcon className="size-4.5" aria-hidden />
          {t("cancel")}
        </Button>
      </header>

      {/* Sized by the room the sidebar leaves, not by the window: at 1280px
          with the sidebar open a preview beside the step squeezed its fields. */}
      <div className="flex flex-1 flex-col @container">
        <div className="grid flex-1 gap-6 pb-28 md:pb-0 @5xl:grid-cols-[minmax(0,1fr)_22rem] @7xl:grid-cols-[minmax(0,1fr)_25rem] @7xl:gap-8">
          <div className="flex min-w-0 flex-col gap-5">
            {/* md:flex-1 stretches the card; on a phone it isn't a card. */}
            {/* The app's content panel is already the sheet, so the step is a
              card on it: one rung up the shell → sheet → card ladder. */}
            <section
              ref={sheetRef}
              className={cn(
                "@container min-w-0 md:flex-1 md:rounded-card md:bg-card md:px-10 md:py-9",
                "md:shadow-[0_0_0_0.5px_var(--hairline),var(--shadow-card)]",
              )}
            >
              {/* Keyed by step, so each step mounts fresh and plays its entrance.
                  Entry only: an exit would make every Continue wait. */}
              <div
                key={current}
                data-step-motion={motion ?? undefined}
                className={cn(
                  "flex flex-col gap-5 md:gap-7",
                  motion && "animate-in fade-in-0 duration-200 ease-out-quint",
                  // Forward comes in from the end edge, Back from the start;
                  // both flip in RTL. Reduced motion keeps only the fade.
                  motion === "forward" && "motion-safe:slide-in-from-end-3",
                  motion === "back" && "motion-safe:slide-in-from-start-3",
                )}
              >
                {children}
              </div>
            </section>
            <footer
              className={cn(
                "fixed inset-x-0 bottom-0 z-20 flex gap-2.5 border-t bg-background px-4 pt-3",
                "pb-[max(1.5rem,env(safe-area-inset-bottom))]",
                "md:static md:justify-end md:gap-3 md:border-0 md:bg-transparent md:p-0",
              )}
            >
              {actions}
            </footer>
          </div>
          {preview && (
            <div className="sticky top-6 hidden self-start @5xl:block">{preview}</div>
          )}
        </div>
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("discardTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("discardBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("keepEditing")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => router.push(cancelHref)}
            >
              {t("discard")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** On a computer: the numbered steps, each one a button. */
function StepList({
  steps,
  current,
  reachable,
  onSelect,
}: {
  steps: readonly Step[];
  current: number;
  reachable: (index: number) => boolean;
  onSelect: (index: number) => void;
}) {
  const t = useTranslations("common");

  return (
    <nav aria-label={t("steps")} className="hidden md:block">
      <ol className="flex items-center gap-2.5">
        {steps.map((step, i) => {
          const done = i < current;
          const now = i === current;
          return (
            <li key={step.label} className="flex items-center gap-2.5">
              {i > 0 && (
                <span
                  aria-hidden
                  className="relative h-[1.5px] w-9 overflow-hidden bg-foreground/20"
                >
                  <ProgressFill filled={i <= current} />
                </span>
              )}
              <button
                type="button"
                disabled={!now && !reachable(i)}
                aria-current={now ? "step" : undefined}
                onClick={() => onSelect(i)}
                className={cn(
                  "flex items-center gap-2 rounded-md text-sm text-muted-foreground transition-colors duration-200 ease-[ease]",
                  "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  "enabled:cursor-pointer disabled:cursor-default",
                  (done || now) && "text-foreground",
                  now && "font-semibold",
                )}
              >
                <span
                  className={cn(
                    "flex size-6.5 items-center justify-center rounded-full border-[1.5px] text-[0.8125rem] font-semibold tabular-nums",
                    "transition-[background-color,border-color,color] duration-200 ease-[ease]",
                    done && "border-foreground bg-foreground text-background",
                    now && "border-2 border-foreground",
                    !done && !now && "border-foreground/20",
                  )}
                >
                  {done ? (
                    <CheckIcon
                      // Enters as the step is finished: ease-out from 90%,
                      // never from nothing. Reduced motion keeps the fade.
                      className={cn(
                        "size-3.5 transition-[opacity,scale] duration-150 ease-out-quint",
                        "starting:opacity-0 motion-safe:starting:scale-90",
                      )}
                      aria-hidden
                    />
                  ) : (
                    i + 1
                  )}
                </span>
                {step.label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** On a phone: a segmented progress bar and "step 2 of 3 · Sizes". */
function StepProgress({
  steps,
  current,
}: {
  steps: readonly Step[];
  current: number;
}) {
  const t = useTranslations("common");

  return (
    <div className="flex flex-col gap-2 md:hidden">
      <div className="flex gap-1.5" aria-hidden>
        {steps.map((step, i) => (
          <span
            key={step.label}
            className="relative h-1 flex-1 overflow-hidden rounded-full bg-foreground/20"
          >
            <ProgressFill filled={i <= current} />
          </span>
        ))}
      </div>
      <p className="text-[0.8125rem] text-muted-foreground">
        {t("stepOf", {
          current: current + 1,
          total: steps.length,
          name: steps[current]?.label ?? "",
        })}
      </p>
    </div>
  );
}

/**
 * The ink inside a step bar's track. It grows from the start edge when a step
 * is reached and shrinks back toward it on Back: a transition, not keyframes,
 * so clicking through steps quickly retargets mid-way instead of restarting.
 * Moving on screen, so ease-in-out. Reduced motion fades it in place.
 */
function ProgressFill({ filled }: { filled: boolean }) {
  return (
    <span
      className={cn(
        "absolute inset-0 rounded-[inherit] bg-foreground ltr:origin-left rtl:origin-right",
        "transition-transform duration-300 ease-in-out-quint",
        "motion-reduce:scale-x-100 motion-reduce:transition-opacity motion-reduce:duration-200",
        filled ? "scale-x-100" : "scale-x-0 motion-reduce:opacity-0",
      )}
    />
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
      <Illustration
        name={illustration}
        // Grows in slightly as its step slides in (never on the first load).
        className="in-data-step-motion:animate-in in-data-step-motion:fade-in-0 in-data-step-motion:duration-200 in-data-step-motion:ease-out-quint in-data-step-motion:motion-safe:zoom-in-96"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <h3
          data-step-title
          tabIndex={-1}
          className="text-3xl font-semibold tracking-[-0.01em] outline-none md:text-[2.125rem]"
        >
          {title}
        </h3>
        <p className="text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

/**
 * The footer's buttons. Back is a square icon on a phone and "‹ Back" on a
 * computer. The primary button is the form's submit button, so Enter in a
 * field does what it says: continue, or save on the last step. While editing,
 * Save is always there and Continue becomes the secondary button.
 */
export function StepActions({
  first,
  last,
  editing,
  pending,
  onBack,
  onContinue,
  saveLabel,
}: {
  first: boolean;
  last: boolean;
  editing: boolean;
  pending: boolean;
  onBack: () => void;
  onContinue: () => void;
  saveLabel: string;
}) {
  const t = useTranslations("common");
  const saves = editing || last;

  return (
    <>
      {!first && (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onBack}
          aria-label={t("back")}
          className={cn(
            roomy.button,
            roomy.raised,
            "w-13 shrink-0 px-0 md:w-auto md:px-5",
          )}
        >
          <ChevronRight
            className="size-5 ltr:rotate-180 md:size-4.5"
            aria-hidden
          />
          <span className="hidden md:inline">{t("back")}</span>
        </Button>
      )}
      {editing && !last && (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onContinue}
          className={cn(roomy.button, roomy.raised, "flex-1 md:flex-none")}
        >
          {t("continue")}
          <ChevronLeft className="size-4.5 ltr:rotate-180" aria-hidden />
        </Button>
      )}
      <Button
        type="submit"
        disabled={pending}
        className={cn(roomy.button, "flex-1 md:min-w-40 md:flex-none")}
      >
        {saves ? (
          <>
            <CheckIcon className="size-4.5" aria-hidden />
            {saveLabel}
          </>
        ) : (
          <>
            {t("continue")}
            <ChevronLeft className="size-4.5 ltr:rotate-180" aria-hidden />
          </>
        )}
      </Button>
    </>
  );
}
