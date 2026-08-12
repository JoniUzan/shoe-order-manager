"use client";

import { parseSizes } from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

/**
 * The model's size run, as removable chips.
 *
 * Order is the point: a run reads 39, 40, 41 and the order form lays the grid
 * out in exactly this sequence, so new sizes append rather than sort. Sizes
 * stay free text ("42.5", "US 9") — never coerced to numbers.
 */
export function SizeListInput({
  value,
  onChange,
  id,
}: {
  value: string[];
  onChange: (sizes: string[]) => void;
  id?: string;
}) {
  const t = useTranslations("catalog");
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  /** Accepts "41" or a pasted "39,40,41"; drops blanks and duplicates. */
  function commit(text: string) {
    const next = parseSizes([...value, text].join(","));
    if (next.length !== value.length) onChange(next);
    setDraft("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      // Enter would otherwise submit the whole catalog form.
      e.preventDefault();
      if (draft.trim()) commit(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-11 flex-wrap items-center gap-1.5 rounded-md border border-input",
        "bg-transparent px-2 py-1.5 shadow-xs transition-[color,box-shadow]",
        "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        "dark:bg-input/30",
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((size) => (
        <Badge key={size} variant="secondary" className="gap-1 py-1 ps-2.5 pe-1">
          <span className="tabular-nums">{size}</span>
          <button
            type="button"
            // Removing a size must not steal the click that focuses the input.
            onClick={(e) => {
              e.stopPropagation();
              onChange(value.filter((s) => s !== size));
            }}
            aria-label={t("removeSize", { size })}
            className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <input
        ref={inputRef}
        id={id}
        value={draft}
        dir="ltr"
        inputMode="text"
        onChange={(e) => {
          // A pasted list arrives here in one go rather than as keystrokes.
          if (e.target.value.includes(",")) commit(e.target.value);
          else setDraft(e.target.value);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => draft.trim() && commit(draft)}
        placeholder={value.length === 0 ? t("sizesPlaceholder") : ""}
        className="min-w-24 flex-1 bg-transparent text-start text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
