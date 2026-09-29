"use client";

import { Input } from "@repo/ui/components/input";
import { cn } from "@repo/ui/lib/utils";
import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { toast } from "sonner";

import { FieldError } from "./field-error";
import { useSettingsPhone } from "./setting-row";

/**
 * A settings text field with no Save button: it saves when the user leaves
 * it (or presses Enter), if the value changed, then shows "Saved" for a
 * moment. `validate` returns an error key for `FieldError`, or nothing.
 */
export function AutosaveInput({
  defaultValue,
  onSave,
  validate,
  onValueChange,
  dir,
  className,
  ...props
}: Omit<ComponentProps<"input">, "defaultValue" | "onBlur"> & {
  defaultValue: string;
  onSave: (value: string) => Promise<boolean>;
  validate?: (value: string) => string | undefined;
  /** Every keystroke, for something that follows the field live. */
  onValueChange?: (value: string) => void;
}) {
  const t = useTranslations("settings");
  const phone = useSettingsPhone();
  const rtl = useLocale() === "he";
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const savedValue = useRef(defaultValue.trim());
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function save() {
    const next = value.trim();
    if (next === savedValue.current) {
      setError(undefined);
      return;
    }
    const invalid = validate?.(next);
    setError(invalid);
    if (invalid) return;

    if (await onSave(next)) {
      savedValue.current = next;
      setSaved(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setSaved(false), 2000);
    } else {
      toast.error(t("errorGeneric"));
    }
  }

  // A left-to-right value (a phone, an ID) in a Hebrew page still lines up
  // with the page's other values rather than with its own direction.
  const ltrInRtl = dir === "ltr" && rtl;

  const input = (
    <Input
      {...props}
      dir={dir}
      value={value}
      aria-invalid={!!error}
      onChange={(e) => {
        setValue(e.target.value);
        onValueChange?.(e.target.value);
      }}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className={cn(
        phone
          ? "h-12 flex-1 rounded-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 dark:bg-transparent"
          : "w-[300px]",
        phone ? (rtl ? "text-left" : "text-right") : ltrInRtl && "text-right",
        className,
      )}
    />
  );

  const savedMark = saved && (
    <span
      role="status"
      className="flex shrink-0 items-center gap-1 text-[13px] text-muted-foreground"
    >
      <Check className="size-3.5" />
      {!phone && t("saved")}
    </span>
  );

  if (phone) {
    return (
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          {savedMark}
          {input}
        </div>
        <FieldError message={error} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {savedMark}
      <div className="flex flex-col gap-1">
        {input}
        <FieldError message={error} />
      </div>
    </div>
  );
}
