"use client";

import { cn } from "@repo/ui/lib/utils";
import { createContext, useContext, type ReactNode } from "react";

/**
 * On a phone the rows sit in rounded cards (the grouped-list look); on a
 * computer they are bare rows with dividers under a section heading. The
 * sections render the same markup either way and read this to style it.
 */
const PhoneContext = createContext(false);

export const SettingsPhoneProvider = PhoneContext.Provider;

export function useSettingsPhone() {
  return useContext(PhoneContext);
}

export function SettingSection({
  title,
  description,
  children,
}: {
  /** Left out on a phone when the sheet's title already names it. */
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  const phone = useSettingsPhone();

  if (phone) {
    return (
      <section className="flex flex-col gap-2">
        {title && (
          <h3 className="px-4 text-[13px] text-muted-foreground">{title}</h3>
        )}
        <div className="overflow-hidden rounded-2xl border bg-background dark:bg-muted">
          {children}
        </div>
        {description && (
          <p className="px-4 text-[13px] text-muted-foreground">
            {description}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="flex flex-col">
      <h3 className="text-[17px] font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      <div className="mt-2 flex flex-col">{children}</div>
    </section>
  );
}

/** One setting: its label (and a line of help) on the start side, the control on the end side. */
export function SettingRow({
  label,
  htmlFor,
  description,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  description?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const phone = useSettingsPhone();
  const Label = htmlFor ? "label" : "div";

  return (
    <div
      className={cn(
        "flex items-center border-b last:border-b-0",
        phone
          ? "min-h-13 gap-3 px-4 py-1.5"
          : "min-h-16 justify-between gap-6 py-3",
        className,
      )}
    >
      <div className={cn("min-w-0", phone && "w-24 shrink-0")}>
        <Label htmlFor={htmlFor} className={phone ? "text-base" : "text-[15px]"}>
          {label}
        </Label>
        {description && (
          <div className="mt-1 text-[13.5px] text-muted-foreground">
            {description}
          </div>
        )}
      </div>
      <div
        className={cn(
          "flex min-w-0 items-center gap-3",
          phone ? "flex-1 justify-end" : "shrink-0",
        )}
      >
        {children}
      </div>
    </div>
  );
}
