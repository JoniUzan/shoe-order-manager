"use client";

import { cn } from "@repo/ui/lib/utils";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * A small one-of-a-few picker (the theme's computer / sun / moon). Native
 * radios under the hood, so arrow keys and screen readers work as a group.
 *
 * The selected mark is one pill that slides to the picked option, with the
 * same motion as the app's tabs (`TabsList`): measured, placed without
 * animating on first paint, then travelling 200ms ease-out-quint.
 */
export function Segmented<T extends string>({
  name,
  label,
  value,
  onChange,
  options,
}: {
  name: string;
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ x: number; w: number } | null>(null);
  const [travels, setTravels] = useState(false);

  useLayoutEffect(() => {
    const group = ref.current;
    if (!group) return;
    const measure = () => {
      const active = group.querySelector<HTMLElement>(
        `[data-value="${CSS.escape(value)}"]`,
      );
      if (!active) return setBox(null);
      // Layout offsets, not getBoundingClientRect: the settings dialog scales
      // in from 95%, and a measurement taken mid-zoom would leave the pill a
      // few pixels short (a transform doesn't trigger the ResizeObserver).
      // offsetLeft is physical, like the translate — right in RTL as well.
      setBox({ x: active.offsetLeft, w: active.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(group);
    return () => ro.disconnect();
  }, [value]);

  // Start animating only on the frame after the pill has been placed, so it
  // doesn't slide in from the edge when the dialog opens.
  useEffect(() => {
    if (!box || travels) return;
    const id = requestAnimationFrame(() => setTravels(true));
    return () => cancelAnimationFrame(id);
  }, [box, travels]);

  const sliding = box !== null;

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={label}
      data-sliding={sliding || undefined}
      className="group/seg relative inline-flex gap-0.5 rounded-lg border bg-muted p-0.75"
    >
      {sliding && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-0.75 left-0 h-8 rounded-md bg-background shadow-sm ring-1 ring-border",
            travels && "transition-[transform,width] duration-200 ease-out-quint",
            "motion-reduce:transition-none",
          )}
          style={{ transform: `translateX(${box.x}px)`, width: box.w }}
        />
      )}
      {options.map((option) => (
        <label
          key={option.value}
          title={option.label}
          data-value={option.value}
          className="relative flex"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            aria-label={option.icon ? option.label : undefined}
            className="peer sr-only"
          />
          <span
            className={cn(
              "flex h-8 min-w-10 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 text-sm text-muted-foreground transition-colors duration-150",
              "hover:text-foreground peer-checked:text-foreground",
              // Until the sliding pill is measured (SSR, first paint) the
              // checked option draws its own; after that the pill does.
              "peer-checked:bg-background peer-checked:shadow-sm peer-checked:ring-1 peer-checked:ring-border",
              "group-data-sliding/seg:peer-checked:bg-transparent! group-data-sliding/seg:peer-checked:shadow-none! group-data-sliding/seg:peer-checked:ring-0!",
              "peer-focus-visible:outline-[3px] peer-focus-visible:outline-ring/50",
              "[&_svg]:size-4.5",
            )}
          >
            {option.icon ?? option.label}
          </span>
        </label>
      ))}
    </div>
  );
}
