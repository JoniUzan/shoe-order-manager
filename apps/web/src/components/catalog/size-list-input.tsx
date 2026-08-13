"use client";

import {
  canonicalSizes,
  expandSizeRange,
  MAX_SIZES,
  normalizeSize,
} from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { cn } from "@repo/ui/lib/utils";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

/**
 * A model's size run.
 *
 * Entered as a range rather than one size per keystroke: a 36–45 run was ten
 * type-and-Enter cycles, and every one of them was a chance to type "42.0"
 * where every order says "42" — a mismatch that silently becomes a second
 * column in the order form's grid.
 *
 * The chips remain the source of truth, so anything the generator gets wrong
 * is one click to fix, and an odd size outside the run can still be added by
 * hand. Ordering comes from `canonicalSizes`, so what is shown here is exactly
 * what gets stored.
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
  const uid = useId();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [step, setStep] = useState("1");
  const [extra, setExtra] = useState("");

  const fromN = Number(from);
  const toN = Number(to);
  const hasRange =
    from.trim() !== "" &&
    to.trim() !== "" &&
    Number.isFinite(fromN) &&
    Number.isFinite(toN);
  const rangeInvalid = hasRange && fromN > toN;
  const canGenerate = hasRange && !rangeInvalid;

  function generate() {
    if (!canGenerate) return;
    // Replaces rather than merges: correcting 36→38 and generating again must
    // not leave 36 and 37 behind.
    onChange(expandSizeRange(fromN, toN, step === "0.5" ? 0.5 : 1));
  }

  const atCapacity = value.length >= MAX_SIZES;

  function addExtra() {
    const size = normalizeSize(extra);
    // The schema caps a run at MAX_SIZES. Adding past it would fail on save
    // with a generic "something went wrong" and no field to point at.
    if (!size || atCapacity) return;
    onChange(canonicalSizes([...value, size]));
    setExtra("");
  }

  const numberField = (
    label: string,
    fieldId: string,
    v: string,
    set: (s: string) => void,
  ) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="text-xs text-muted-foreground">
        {label}
      </label>
      <Input
        id={fieldId}
        value={v}
        onChange={(e) => set(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            // Enter here would submit the catalog form.
            e.preventDefault();
            generate();
          }
        }}
        type="number"
        inputMode="decimal"
        step="0.5"
        min="0.5"
        dir="ltr"
        className="h-11 w-20 text-center md:h-9"
        aria-invalid={rangeInvalid}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Generator */}
      <div className="flex flex-wrap items-end gap-2">
        {numberField(t("sizesFrom"), `${uid}-from`, from, setFrom)}
        {numberField(t("sizesTo"), `${uid}-to`, to, setTo)}

        <div className="flex flex-col gap-1">
          <label htmlFor={`${uid}-step`} className="text-xs text-muted-foreground">
            {t("sizesStep")}
          </label>
          <Select value={step} onValueChange={setStep}>
            <SelectTrigger id={`${uid}-step`} className="h-11 w-24 md:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="0.5">0.5</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={generate}
          disabled={!canGenerate}
          className="h-11 md:h-9"
        >
          {t("sizesGenerate")}
        </Button>
      </div>

      <p
        className={cn(
          "text-xs",
          rangeInvalid ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {rangeInvalid ? t("sizesRangeInvalid") : t("sizesGenerateHint")}
      </p>

      {/* The run itself */}
      <div
        id={id}
        className={cn(
          "flex min-h-11 flex-wrap items-center gap-1.5 rounded-md border border-input",
          "bg-transparent px-2 py-1.5 shadow-xs dark:bg-input/30",
        )}
      >
        {value.length === 0 ? (
          <span className="px-1 text-sm text-muted-foreground">
            {t("sizesEmpty")}
          </span>
        ) : (
          value.map((size) => (
            <Badge
              key={size}
              variant="secondary"
              className="gap-1 py-1 ps-2.5 pe-1"
            >
              <span className="tabular-nums">{size}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((s) => s !== size))}
                aria-label={t("removeSize", { size })}
                className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))
        )}
      </div>

      {/* One-off additions outside the generated run */}
      <div className="flex gap-2">
        <Input
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addExtra();
            }
          }}
          // Numeric because every supported format (EU/US/UK) is. Without this
          // the box accepted any text, and one non-numeric entry used to
          // silently disable the numeric sort for the whole run.
          type="number"
          step="0.5"
          min="0"
          dir="ltr"
          inputMode="decimal"
          placeholder={t("sizesAddPlaceholder")}
          aria-label={t("sizesAdd")}
          className="h-11 w-32 text-center md:h-9"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={addExtra}
          disabled={!normalizeSize(extra) || atCapacity}
          aria-label={t("sizesAdd")}
          className="size-11 md:size-9"
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}
