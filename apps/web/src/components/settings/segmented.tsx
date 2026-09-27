"use client";

import { cn } from "@repo/ui/lib/utils";
import type { ReactNode } from "react";

/**
 * A small one-of-a-few picker (the theme's computer / sun / moon). Native
 * radios under the hood, so arrow keys and screen readers work as a group.
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
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex gap-0.5 rounded-[10px] border bg-muted p-[3px]"
    >
      {options.map((option) => (
        <label key={option.value} title={option.label} className="relative">
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
              "flex h-8 min-w-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm text-muted-foreground transition-colors",
              "hover:text-foreground peer-checked:bg-background peer-checked:text-foreground peer-checked:shadow-sm peer-checked:ring-1 peer-checked:ring-border",
              "peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50",
              "[&_svg]:size-[18px]",
            )}
          >
            {option.icon ?? option.label}
          </span>
        </label>
      ))}
    </div>
  );
}
