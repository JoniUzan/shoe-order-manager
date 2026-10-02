import { cn } from "@repo/ui/lib/utils";
import type { CSSProperties } from "react";

/*
 * The look and motion of the forms built on StepForm. Applied here rather than
 * in @repo/ui, so the rest of the app keeps its denser controls.
 *
 * Motion follows Emil Kowalski's rules (see ./CLAUDE.md): ease-out-quint for
 * what enters, ease-in-out-quint for what moves on screen, `ease` for colour,
 * under 300ms, transform and opacity only, transitions (interruptible) over
 * keyframes, and reduced motion keeps the fades but drops the movement.
 */

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

export const roomy = {
  /** 48px fields with a 16px corner and 16px text. */
  field: cn(
    "h-12 rounded-2xl px-3.5 text-base shadow-none md:text-base",
    // No spinner arrows: they crowd the small pair boxes and nobody steps a
    // price by 0.01.
    "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
  ),
  area: "min-h-24 rounded-2xl px-3.5 py-3 text-base shadow-none md:text-base",
  label: "text-[0.8125rem] font-medium text-muted-foreground",
  /** Buttons: 52px on a phone, 44px on a computer, with press feedback. */
  button: cn(
    "h-13 rounded-2xl px-5 text-base md:h-11 md:text-[0.9375rem]",
    PRESS,
  ),
  /** Press feedback for anything else pressable in these forms. */
  press: PRESS,
  /** A secondary button: a raised puck rather than an outline. */
  raised: cn(
    "border-0 bg-card shadow-[var(--shadow-raised)] hover:bg-accent dark:bg-card dark:hover:bg-accent",
    // Disabled, a puck on a card would vanish: keep its outline instead.
    "disabled:shadow-none disabled:ring-1 disabled:ring-input",
  ),
  /**
   * A line that appears, like a field's error: eases in from just above.
   * @starting-style, so it plays only when the line is inserted.
   */
  appear: cn(
    "transition-[opacity,translate] duration-150 ease-out-quint",
    "starting:opacity-0 motion-safe:starting:-translate-y-1",
  ),
  /**
   * An item the user just added (a Pack, an order line): eases in from just
   * below full size. Put it only on that item (see useAddedItem), or every
   * item would play it when its step opens.
   */
  enter: cn(
    "transition-[opacity,scale,translate] duration-200 ease-out-quint",
    "starting:opacity-0 motion-safe:starting:scale-[0.97] motion-safe:starting:-translate-y-1",
  ),
  /**
   * Items that come in together, like a generated size run: each one eases in
   * after the one before. Pair it with `cascadeDelay(i, count)` as a style, and
   * only after the user's action (on first render nothing should play).
   */
  cascade: cn(
    "transition-[opacity,scale] duration-150 ease-out-quint [transition-delay:var(--cascade-delay)]",
    "starting:opacity-0 motion-safe:starting:scale-95 motion-reduce:[transition-delay:0ms]",
  ),
};

/**
 * The style that times item `i` of `count` in a cascade: 30ms apart, tightened
 * for long lists so the whole wave spans at most 300ms. Capping the delay
 * instead made a long list cascade for a few items and then show the rest
 * all at once.
 */
export function cascadeDelay(i: number, count: number): CSSProperties {
  const step = count > 1 ? Math.min(30, 300 / (count - 1)) : 0;
  return { "--cascade-delay": `${i * step}ms` } as CSSProperties;
}
