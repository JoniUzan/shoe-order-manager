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
import { useId, useState, type CSSProperties } from "react";

import { roomy } from "@/components/form-steps/form-steps";

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
/**
 * The gap between chips in the Generate cascade: 30ms, tightened for long runs
 * so the whole wave spans at most 300ms. Capping the delay instead made a long
 * run cascade for ten chips and then show the rest all at once.
 */
function chipStep(count: number): number {
  return count > 1 ? Math.min(30, 300 / (count - 1)) : 0;
}

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
  // Chips ease in only after the user changes the run here: not when the step
  // opens on sizes already there. Each Generate is a new generation of keys,
  // so the whole replaced run plays again; a size added by hand comes alone.
  const [generation, setGeneration] = useState(0);
  const [live, setLive] = useState(false);
  const [stagger, setStagger] = useState(false);

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
    setGeneration((g) => g + 1);
    setLive(true);
    setStagger(true);
  }

  const atCapacity = value.length >= MAX_SIZES;

  function addExtra() {
    const size = normalizeSize(extra);
    // The schema caps a run at MAX_SIZES. Adding past it would fail on save
    // with a generic "something went wrong" and no field to point at.
    if (!size || atCapacity) return;
    onChange(canonicalSizes([...value, size]));
    setLive(true);
    setStagger(false);
    setExtra("");
  }

  const numberField = (
    label: string,
    fieldId: string,
    v: string,
    set: (s: string) => void,
  ) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className={roomy.label}>
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
        className={cn(roomy.field, "w-24 text-center tabular-nums")}
        aria-invalid={rangeInvalid}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Generator */}
      <div className="flex flex-wrap items-end gap-3">
        {numberField(t("sizesFrom"), `${uid}-from`, from, setFrom)}
        {numberField(t("sizesTo"), `${uid}-to`, to, setTo)}

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${uid}-step`} className={roomy.label}>
            {t("sizesStep")}
          </label>
          <Select value={step} onValueChange={setStep}>
            <SelectTrigger id={`${uid}-step`} className={cn(roomy.field, "w-24 data-[size=default]:h-12")}>
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
          className={cn(roomy.button, roomy.raised, "h-12 md:h-12")}
        >
          {t("sizesGenerate")}
        </Button>
      </div>

      <p
        className={cn(
          "text-[0.8125rem]",
          rangeInvalid ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {rangeInvalid ? t("sizesRangeInvalid") : t("sizesGenerateHint")}
      </p>

      {/* The run itself */}
      <div
        id={id}
        className={cn(
          "flex min-h-14 flex-wrap items-center gap-2 rounded-2xl border border-input",
          "p-2.5 dark:bg-input/30",
        )}
      >
        {value.length === 0 ? (
          <span className="px-1.5 text-muted-foreground">
            {t("sizesEmpty")}
          </span>
        ) : (
          value.map((size, i) => (
            <Badge
              key={`${generation}-${size}`}
              variant="secondary"
              className={cn(
                "h-8 gap-1 rounded-full ps-3 pe-1 text-sm",
                // Entering, so ease-out from just below full size. One even wave
                // (see chipStep): in within ~450ms however long the run, and
                // clickable throughout. Reduced motion: one fade, no stagger.
                live && [
                  "transition-[opacity,scale] duration-150 ease-out-quint [transition-delay:var(--chip-delay)]",
                  "starting:opacity-0 motion-safe:starting:scale-95 motion-reduce:[transition-delay:0ms]",
                ],
              )}
              style={
                stagger
                  ? ({ "--chip-delay": `${i * chipStep(value.length)}ms` } as CSSProperties)
                  : undefined
              }
            >
              <span className="tabular-nums">{size}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((s) => s !== size))}
                aria-label={t("removeSize", { size })}
                className="rounded-full p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </Badge>
          ))
        )}
      </div>

      {/* One-off additions outside the generated run */}
      <div className="flex gap-3">
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
          className={cn(roomy.field, "w-40 text-center")}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={addExtra}
          disabled={!normalizeSize(extra) || atCapacity}
          aria-label={t("sizesAdd")}
          className={cn(roomy.raised, roomy.press, "size-12 rounded-2xl")}
        >
          <Plus className="size-4.5" />
        </Button>
      </div>
    </div>
  );
}
