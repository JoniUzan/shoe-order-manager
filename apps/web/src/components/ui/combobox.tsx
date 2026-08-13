"use client";

import { Button } from "@repo/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import { cn } from "@repo/ui/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { useRef, useState } from "react";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Trailing muted text — a price, a count. Not searched. */
  hint?: string;
}

/**
 * A searchable single-select. Replaces `Select` wherever the list is long
 * enough that scanning it costs more than typing: the customer list alone was
 * 18 names in a 586px scroller with no filter.
 *
 * The trigger is 44px on touch and 36px from `md` up — a plain `h-9` is below
 * the touch-target minimum, and this control is used on a phone in a shop.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  id,
  invalid,
  describedBy,
  disabled,
  className,
}: {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          className={cn(
            "h-11 w-full justify-between px-3 font-normal md:h-9",
            // Match Input, not Button. `variant="outline"` paints an opaque
            // bg-background with the --border colour, which reads as a grey
            // control sitting among white translucent fields on the card. Only
            // visible in light mode, because both resolve to --input/30 in dark.
            "border-input bg-transparent dark:bg-input/30",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate text-start">
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        // Match the trigger so the list never looks detached from its control.
        className="w-(--radix-popover-trigger-width) p-0"
      >
        <Command
          // Search the label only. `value` is a cuid, and letting cmdk match
          // against it would surface hits with no visible reason.
          filter={(itemValue, search) => {
            const label = options.find((o) => o.value === itemValue)?.label ?? "";
            return label.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={searchPlaceholder} className="h-10" />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(next) => {
                    onChange(next);
                    setOpen(false);
                    // Radix returns focus to the trigger on close, but only if
                    // it still owns it — selecting via mouse leaves focus in
                    // the list, and the next Tab would restart from the top.
                    triggerRef.current?.focus();
                  }}
                  className="gap-2"
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      option.value === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                  {option.hint ? (
                    <span className="ms-auto text-xs text-muted-foreground tabular-nums">
                      {option.hint}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
