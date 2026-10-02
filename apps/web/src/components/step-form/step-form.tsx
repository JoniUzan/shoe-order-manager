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
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { CheckIcon, ChevronDown, ChevronLeft, ChevronRight, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createContext,
  use,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react";

import { roomy } from "@/components/step-form/roomy";
import {
  Illustration,
  type IllustrationName,
} from "@/components/ui/illustration";
import { useRouter } from "@/i18n/navigation";

/*
 * A form in the app's stepped style, built by composition like the shadcn
 * primitives. How to build one, and why it moves the way it does, is in
 * ./CLAUDE.md.
 *
 *   const flow = useStepForm({ steps, editing });
 *   <StepForm flow={flow} onSave={…} cancelHref="/catalog" dirty={…} pending={…}>
 *     <StepForm.Header title={…} />
 *     <StepForm.Pane>
 *       <StepForm.Step index={0}>…</StepForm.Step>
 *     </StepForm.Pane>
 *     <StepForm.Preview label={…}>…</StepForm.Preview>
 *     <StepForm.Actions saveLabel={…} />
 *   </StepForm>
 */

export interface StepDef {
  label: string;
  /** Checked before Continue leaves this step, e.g. a required name. */
  canLeave?: () => boolean | Promise<boolean>;
}

type Direction = "forward" | "back";

/**
 * The state of a form's steps, created by the form itself so its own code can
 * move between them too (a failed save going to the step with the problem).
 * A new record walks the steps in order; an existing one can go anywhere.
 * With no steps it is a one-page form: the bar disappears and Save submits.
 */
export function useStepForm({
  steps,
  editing,
  start = 0,
}: {
  steps: readonly StepDef[];
  editing: boolean;
  /** The step it opens on, e.g. an existing order's Review. */
  start?: number;
}) {
  const last = Math.max(steps.length - 1, 0);
  const [current, setCurrent] = useState(start);
  // The furthest step reached, so the bar can return to it.
  const [reached, setReached] = useState(editing ? last : 0);
  // Which way the last change went; null until one happens, so the page
  // itself doesn't animate in.
  const [direction, setDirection] = useState<Direction | null>(null);

  function goTo(index: number) {
    if (index === current) return;
    setDirection(index > current ? "forward" : "back");
    setCurrent(index);
    setReached((r) => Math.max(r, index));
  }

  async function next() {
    const canLeave = steps[current]?.canLeave;
    if (canLeave && !(await canLeave())) return;
    if (current < last) goTo(current + 1);
  }

  return {
    steps,
    editing,
    current,
    last,
    direction,
    /** Whether the primary button saves (else it continues). */
    saves: editing || current === last,
    reachable: (index: number) => index <= reached,
    goTo,
    next,
    back: () => goTo(current - 1),
  };
}

export type StepFormFlow = ReturnType<typeof useStepForm>;

interface StepFormContextValue extends StepFormFlow {
  pending: boolean;
  dirty: boolean;
  cancelHref: string;
}

const StepFormContext = createContext<StepFormContextValue | null>(null);

/** The form's step state, from any part inside <StepForm>. */
export function useStepFormContext() {
  const ctx = use(StepFormContext);
  if (!ctx) throw new Error("A StepForm part was used outside <StepForm>.");
  return ctx;
}

/**
 * The <form>. It owns the layout: each part places itself by grid area, so
 * their order in JSX doesn't matter. A Preview gets its own column when there
 * is room beside the pane (measured from the space the sidebar leaves, not
 * the window). Submitting continues to the next step until the form can save,
 * so Enter in a field does what the primary button says.
 */
function Root({
  flow,
  onSave,
  cancelHref,
  dirty,
  pending,
  className,
  children,
}: {
  flow: StepFormFlow;
  /** Called on submit once the form can save: usually react-hook-form's handleSubmit. */
  onSave: (e: FormEvent<HTMLFormElement>) => void;
  cancelHref: string;
  dirty: boolean;
  pending: boolean;
  className?: string;
  children: ReactNode;
}) {
  const ready = useHydrated();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    if (!flow.saves) {
      e.preventDefault();
      void flow.next();
      return;
    }
    onSave(e);
  }

  return (
    <StepFormContext value={{ ...flow, pending, dirty, cancelHref }}>
      {/* Fills the content panel's height, so the pane reaches its buttons. */}
      <div className="flex flex-1 flex-col @container md:min-h-0">
        <form
          onSubmit={onSubmit}
          // Validation is react-hook-form's job: native constraint validation
          // silently vetoes submit when a scratch field holds a bad value.
          noValidate
          data-slot="step-form"
          // Set once the form runs in the browser. Until then the fields are
          // the server's HTML, and react-hook-form writes their saved values
          // in on hydration, over anything typed before it.
          data-ready={ready || undefined}
          className={cn(
            "grid flex-1 grid-cols-1 grid-rows-[auto_1fr_auto] gap-x-6 gap-y-5 pb-28 md:gap-y-6 md:pb-0",
            "[grid-template-areas:'header'_'pane'_'actions']",
            "has-[>[data-slot=step-form-summary]]:grid-rows-[auto_auto_1fr_auto]",
            "has-[>[data-slot=step-form-summary]]:[grid-template-areas:'header'_'summary'_'pane'_'actions']",
            // On a computer the form is held to the panel's height and the
            // pane's row may shrink below its content: the pane scrolls.
            "md:min-h-0 md:grid-rows-[auto_minmax(0,1fr)_auto]",
            "md:has-[>[data-slot=step-form-summary]]:grid-rows-[auto_auto_minmax(0,1fr)_auto]",
            "@5xl:has-[>[data-slot=step-form-preview]]:grid-cols-[minmax(0,1fr)_22rem]",
            "@5xl:has-[>[data-slot=step-form-preview]]:[grid-template-areas:'header_header'_'pane_preview'_'actions_preview']",
            "@7xl:has-[>[data-slot=step-form-preview]]:grid-cols-[minmax(0,1fr)_25rem] @7xl:gap-x-8",
            className,
          )}
        >
          {children}
        </form>
      </div>
    </StepFormContext>
  );
}

const noSubscribe = () => () => {};
/** False in the server's HTML and while hydrating, true after. */
function useHydrated() {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
}

/**
 * The top row: the title, the steps between them, and "✕ Cancel", which asks
 * before throwing away changes. On a phone the steps sit under the row.
 */
function Header({ title }: { title: string }) {
  const t = useTranslations("common");
  const router = useRouter();
  const { dirty, cancelHref } = useStepFormContext();
  const [confirming, setConfirming] = useState(false);

  function cancel() {
    if (dirty) setConfirming(true);
    else router.push(cancelHref);
  }

  return (
    <header
      data-slot="step-form-header"
      className="flex flex-col gap-3.5 [grid-area:header] md:flex-row md:items-center md:justify-between"
    >
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
        <StepList />
      </div>
      <StepProgress />
      <Button
        type="button"
        variant="ghost"
        onClick={cancel}
        className={cn(roomy.button, "hidden md:inline-flex")}
      >
        <XIcon className="size-4.5" aria-hidden />
        {t("cancel")}
      </Button>

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
    </header>
  );
}

/** On a computer: the numbered steps, each one a button. */
function StepList() {
  const t = useTranslations("common");
  const { steps, current, reachable, goTo } = useStepFormContext();
  if (steps.length < 2) return null;

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
                onClick={() => goTo(i)}
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
function StepProgress() {
  const t = useTranslations("common");
  const { steps, current } = useStepFormContext();
  if (steps.length < 2) return null;

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

/**
 * The card the form sits on, down to the buttons. The content panel is
 * already the sheet, so this is one rung up the shell → sheet → card ladder.
 * On a phone it isn't a card. When the step changes, the new step starts at
 * its title, for the eye and for a screen reader.
 */
function Pane({ children }: { children: ReactNode }) {
  const { current } = useStepFormContext();
  const ref = useRef<HTMLElement>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // The page scrolls on a phone, the pane itself on a computer.
    window.scrollTo({ top: 0 });
    ref.current?.scrollTo({ top: 0 });
    ref.current?.querySelector<HTMLElement>("[data-step-title]")?.focus({ preventScroll: true });
  }, [current]);

  return (
    <section
      ref={ref}
      data-slot="step-form-pane"
      className={cn(
        "@container flex min-w-0 flex-col gap-5 [grid-area:pane] md:gap-7",
        "md:rounded-card md:bg-card md:px-10 md:py-9",
        "md:min-h-0 md:overflow-y-auto md:overscroll-contain",
        "md:shadow-[0_0_0_0.5px_var(--hairline),var(--shadow-card)]",
      )}
    >
      {children}
    </section>
  );
}

/**
 * One step's content, shown while it's the current step. It slides in from
 * the side the user is moving toward (forward from the end edge, Back from
 * the start; both flip in RTL), 200ms ease-out. Entry only: an exit would
 * make every Continue wait. Reduced motion keeps the fade.
 */
function Step({ index, children }: { index: number; children: ReactNode }) {
  const { current, direction } = useStepFormContext();
  if (index !== current) return null;

  return (
    <div
      data-step-motion={direction ?? undefined}
      className={cn(
        "flex flex-col gap-5 md:gap-7",
        direction && "animate-in fade-in-0 duration-200 ease-out-quint",
        direction === "forward" && "motion-safe:slide-in-from-end-3",
        direction === "back" && "motion-safe:slide-in-from-start-3",
      )}
    >
      {children}
    </div>
  );
}

/** A step's title, with its illustration and a one-line hint. */
function StepHeader({
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

/** A labelled control, with its error easing in under it. */
function Field({
  label,
  htmlFor,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor} className={roomy.label}>
        {label}
      </Label>
      {children}
      {error && (
        <p className={cn("text-sm text-destructive", roomy.appear)}>{error}</p>
      )}
    </div>
  );
}

/**
 * The record as it will read once saved, filled in as the user goes. Beside
 * the pane when there's room, else not shown at all.
 */
function Preview({ label, children }: { label: string; children: ReactNode }) {
  return (
    <aside
      aria-label={label}
      data-slot="step-form-preview"
      className={cn(
        "sticky top-6 hidden flex-col gap-4 self-start [grid-area:preview] @5xl:flex",
        // A long order's preview scrolls too, rather than run past the window.
        "md:max-h-full md:overflow-y-auto",
        "rounded-card bg-card p-5 shadow-[var(--shadow-card)]",
      )}
    >
      {children}
    </aside>
  );
}

/**
 * The preview for a screen too narrow for it: a bar under the header that
 * reads `label` and `value` (a name, a total) and opens to `children`. Gone
 * once the Preview has its column. Opens with a short ease-out, no height
 * animation: it pushes the step down, and the step shouldn't slide.
 */
function Summary({
  label,
  value,
  children,
}: {
  label: ReactNode;
  value: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <div
      data-slot="step-form-summary"
      className={cn(
        "flex flex-col [grid-area:summary]",
        // Hidden where the Preview has its own column (the same container query).
        "@5xl:has-[~[data-slot=step-form-preview]]:hidden",
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-12 items-center justify-between gap-2 rounded-2xl border bg-surface px-4 text-sm",
          "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          roomy.press,
        )}
      >
        <span className="min-w-0 truncate">{label}</span>
        <span className="flex shrink-0 items-center gap-1.5 font-semibold">
          {value}
          <ChevronDown
            className={cn(
              "size-4 transition-[rotate] duration-200 ease-out-quint",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </span>
      </button>
      {open && (
        <div
          id={id}
          className={cn(
            "mt-2 flex flex-col gap-4 rounded-card bg-card p-5 shadow-[var(--shadow-card)]",
            roomy.appear,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/** The preview's big square: the Product image, or a picture until there is one. */
function PreviewImage({ children }: { children: ReactNode }) {
  return (
    <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-[1.125rem] border border-border bg-surface">
      {children}
    </div>
  );
}

/** The record's name at 22px, a placeholder while it's empty, and a small line under it. */
function PreviewTitle({
  placeholder,
  subtitle,
  children,
}: {
  placeholder: string;
  /** A short line under the name, like a SKU or a phone number. */
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-[1.375rem] font-semibold">
          {children || (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </p>
        {subtitle && (
          <div className="truncate text-[0.8125rem] text-muted-foreground">
            {subtitle}
          </div>
        )}
      </div>
      <hr className="border-border" />
    </>
  );
}

/** The preview's facts: wrap PreviewRows in it. */
function PreviewRows({ children }: { children: ReactNode }) {
  return <dl className="flex flex-col gap-2 text-sm">{children}</dl>;
}

/** One fact. With no value it reads "not set yet", or `empty`. */
function PreviewRow({
  label,
  empty,
  children,
}: {
  label: string;
  empty?: string;
  children?: ReactNode;
}) {
  const t = useTranslations("common");
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end">
        {children ?? (
          <span className="text-muted-foreground">{empty ?? t("notSet")}</span>
        )}
      </dd>
    </div>
  );
}

/**
 * The buttons: right under the pane on a computer, a fixed bottom bar on a
 * phone. With no children it shows the usual set: Back after the first
 * step, Continue as a secondary while editing, and the primary button.
 */
function Actions({
  saveLabel,
  aside,
  children,
}: {
  saveLabel?: string;
  /** A short line at the row's start on a computer, like the order's counts. */
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <footer
      data-slot="step-form-actions"
      className={cn(
        "fixed inset-x-0 bottom-0 z-20 flex gap-2.5 border-t bg-background px-4 pt-3",
        "pb-[max(1.5rem,env(safe-area-inset-bottom))]",
        "md:static md:justify-end md:gap-3 md:border-0 md:bg-transparent md:p-0 md:[grid-area:actions]",
      )}
    >
      {aside && (
        // As tall as the buttons, not centred: the row can be taller than
        // them when the Preview beside it is.
        <p className="me-auto hidden h-11 items-center text-sm text-muted-foreground md:flex">
          {aside}
        </p>
      )}
      {children ?? (
        <>
          <Back />
          <Next />
          <Submit>{saveLabel}</Submit>
        </>
      )}
    </footer>
  );
}

/** Back a step: a square icon on a phone, "‹ Back" on a computer. Hidden on the first step. */
function Back() {
  const t = useTranslations("common");
  const { current, pending, back } = useStepFormContext();
  if (current === 0) return null;

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={back}
      aria-label={t("back")}
      className={cn(
        roomy.button,
        roomy.raised,
        "w-13 shrink-0 px-0 md:w-auto md:px-5",
      )}
    >
      <ChevronRight className="size-5 ltr:rotate-180 md:size-4.5" aria-hidden />
      <span className="hidden md:inline">{t("back")}</span>
    </Button>
  );
}

/**
 * Continue as a secondary button, for when the primary one saves: while
 * editing, before the last step. Hidden otherwise (the primary continues).
 */
function Next() {
  const t = useTranslations("common");
  const { editing, current, last, pending, next } = useStepFormContext();
  if (!editing || current === last) return null;

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => void next()}
      className={cn(roomy.button, roomy.raised, "flex-1 md:flex-none")}
    >
      {t("continue")}
      <ChevronLeft className="size-4.5 ltr:rotate-180" aria-hidden />
    </Button>
  );
}

/**
 * The primary button, the form's submit: it reads Continue until the form can
 * save, then `children` (Save).
 */
function Submit({ children }: { children?: ReactNode }) {
  const t = useTranslations("common");
  const { saves, pending } = useStepFormContext();

  return (
    <Button
      type="submit"
      disabled={pending}
      className={cn(roomy.button, "flex-1 md:min-w-40 md:flex-none")}
    >
      {saves ? (
        <>
          <CheckIcon className="size-4.5" aria-hidden />
          {children ?? t("save")}
        </>
      ) : (
        <>
          {t("continue")}
          <ChevronLeft className="size-4.5 ltr:rotate-180" aria-hidden />
        </>
      )}
    </Button>
  );
}

export const StepForm = Object.assign(Root, {
  Header,
  Pane,
  Step,
  StepHeader,
  Field,
  Preview,
  Summary,
  PreviewImage,
  PreviewTitle,
  PreviewRows,
  PreviewRow,
  Actions,
  Back,
  Next,
  Submit,
});
