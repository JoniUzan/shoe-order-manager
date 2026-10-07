"use client";

import { matchSuggestions } from "@repo/domain";
import { Input } from "@repo/ui/components/input";
import { Popover, PopoverAnchor, PopoverContent } from "@repo/ui/components/popover";
import { cn } from "@repo/ui/lib/utils";
import { useId, useRef, useState, type ComponentProps } from "react";

/**
 * A free-text field that offers what the User typed on earlier orders (a
 * block's Color, Material, Sole). Anything typed is kept as typed; picking a
 * suggestion only saves retyping it, and keeps spelling consistent so the
 * Production sheet groups the rows together.
 *
 * Not the Combobox: that one picks from a fixed list and can't take new text.
 * Not a <datalist>: its list can't be styled and differs per phone.
 */
export function SuggestInput({
  value,
  onChange,
  onBlur,
  suggestions,
  className,
  ...props
}: Omit<ComponentProps<"input">, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  suggestions: readonly string[];
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const matches = matchSuggestions(suggestions, value);
  const shown = open && matches.length > 0;

  function pick(next: string) {
    onChange(next);
    setOpen(false);
    setActive(-1);
  }

  return (
    <Popover open={shown} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          {...props}
          ref={inputRef}
          value={value}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={shown}
          aria-controls={shown ? listId : undefined}
          aria-activedescendant={shown && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          className={className}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={(e) => {
            setOpen(false);
            onBlur?.(e);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              if (!matches.length) return;
              e.preventDefault();
              setOpen(true);
              const step = e.key === "ArrowDown" ? 1 : -1;
              setActive((i) => (i + step + matches.length) % matches.length);
            } else if (e.key === "Enter" && shown && active >= 0) {
              // Pick the highlighted value instead of submitting the form.
              e.preventDefault();
              pick(matches[active]!.value);
            } else if (e.key === "Escape" && shown) {
              e.preventDefault();
              setOpen(false);
            }
          }}
        />
      </PopoverAnchor>
      <PopoverContent
        align="start"
        // Room for the form's bottom bar of buttons: near it, the list opens
        // upward instead of under the buttons.
        collisionPadding={{ bottom: 104 }}
        // Typing stays in the field: the list never takes focus.
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        // A press on the field itself isn't "outside": keep the list open.
        onInteractOutside={(e) => {
          if (e.target === inputRef.current) e.preventDefault();
        }}
        // The popover's own 288px width, like the Combobox lists.
        className="rounded-2xl p-1.5"
      >
        <ul id={listId} role="listbox" className="flex max-h-64 flex-col overflow-y-auto">
          {matches.map((m, i) => (
            <li
              key={m.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown, not click: the field's blur would close the list first.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(m.value);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex h-11 cursor-pointer items-center rounded-xl px-3 text-base",
                "transition-[background-color] duration-150 ease-[ease]",
                i === active && "bg-accent",
              )}
            >
              <span className="truncate">
                {m.start < 0 ? (
                  m.value
                ) : (
                  <>
                    {m.value.slice(0, m.start)}
                    <b className="font-semibold">{m.value.slice(m.start, m.start + m.length)}</b>
                    {m.value.slice(m.start + m.length)}
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
