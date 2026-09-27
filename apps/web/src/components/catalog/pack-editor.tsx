"use client";

import { MAX_PACKS, type Curve } from "@repo/domain";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { cn } from "@repo/ui/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";

/** A pack as the catalog form edits it: pairs are kept as typed, per size. */
export interface PackFormValue {
  /** The stored SizePack's id; absent for a pack added in this form. */
  id?: string;
  name: string;
  pairs: Record<string, string>;
}

/** Truncating, like the order grid: a pair is countable. Blank means 0. */
const pairsOf = (v: string | undefined) => Math.trunc(Number(v)) || 0;

/** Sizes this pack holds pairs in that are no longer in the model's run. */
function orphanSizes(pack: PackFormValue, run: string[]): string[] {
  const inRun = new Set(run);
  return Object.keys(pack.pairs)
    .filter((size) => pairsOf(pack.pairs[size]) !== 0 && !inRun.has(size))
    .sort((a, b) => Number(a) - Number(b));
}

export function packCurve(pack: PackFormValue): Curve {
  return Object.entries(pack.pairs)
    .filter(([, v]) => v.trim() !== "")
    .map(([size, v]) => ({ size, pairs: pairsOf(v) }));
}

export type PackError =
  | { key: "errorPackName" }
  | { key: "errorPackNameDuplicate" }
  | { key: "errorPackPairs" }
  | { key: "errorPackEmpty" }
  | { key: "errorPackSizeNotInRun"; sizes: string };

/**
 * The same rules `shoeModelSchema` enforces, checked in the browser so each
 * one can point at its pack instead of ending in a generic "couldn't save".
 * Derived from the live values rather than stored, so an error clears the
 * moment it's fixed.
 */
export function packErrors(
  packs: PackFormValue[],
  run: string[],
): (PackError | null)[] {
  const seen = new Set<string>();
  return packs.map((pack) => {
    const name = pack.name.trim().toLocaleLowerCase();
    const duplicate = !!name && seen.has(name);
    seen.add(name);
    if (!name) return { key: "errorPackName" };
    if (duplicate) return { key: "errorPackNameDuplicate" };
    const values = Object.values(pack.pairs).filter((v) => v.trim() !== "");
    if (
      values.some((v) => {
        const n = Number(v);
        return !Number.isInteger(n) || n < 0 || n > 999;
      })
    )
      return { key: "errorPackPairs" };
    const orphans = orphanSizes(pack, run);
    if (orphans.length > 0)
      return { key: "errorPackSizeNotInRun", sizes: orphans.join(", ") };
    if (!values.some((v) => pairsOf(v) > 0)) return { key: "errorPackEmpty" };
    return null;
  });
}

/**
 * A model's packs (Hebrew: סדרות): for each, a name and pairs per size.
 *
 * The columns are the model's size run as it stands in the form, so they
 * follow the run live. A size taken off the run while a pack still has pairs
 * in it stays on as a flagged column rather than vanishing — otherwise the
 * pairs in it could be neither seen nor cleared, and Save would be refused for
 * a reason the user has no way to fix.
 */
export function PackEditor({
  value,
  onChange,
  sizes,
  showErrors,
}: {
  value: PackFormValue[];
  onChange: (packs: PackFormValue[]) => void;
  sizes: string[];
  showErrors: boolean;
}) {
  const t = useTranslations("catalog");
  const uid = useId();
  const errors = packErrors(value, sizes);

  function update(index: number, next: PackFormValue) {
    onChange(value.map((p, i) => (i === index ? next : p)));
  }

  return (
    <div className="flex flex-col gap-2">
      {value.map((pack, i) => {
        const orphans = orphanSizes(pack, sizes);
        const columns = [...sizes, ...orphans];
        const total = Object.values(pack.pairs).reduce(
          (n, v) => n + Math.max(0, pairsOf(v)),
          0,
        );
        const error = showErrors ? errors[i] : null;
        const nameId = `${uid}-pack-${i}-name`;

        return (
          <div
            key={pack.id ?? `new-${i}`}
            className={cn(
              "flex min-w-0 flex-col gap-3 rounded-md border p-3",
              error && "border-destructive/60",
            )}
          >
            <div className="flex items-end gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <label
                  htmlFor={nameId}
                  className="text-xs text-muted-foreground"
                >
                  {t("packName")}
                </label>
                <Input
                  id={nameId}
                  value={pack.name}
                  placeholder={t("packNamePlaceholder")}
                  maxLength={100}
                  aria-invalid={
                    error?.key === "errorPackName" ||
                    error?.key === "errorPackNameDuplicate"
                  }
                  onChange={(e) => update(i, { ...pack, name: e.target.value })}
                  className="h-11 md:h-9"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onChange(value.filter((_, k) => k !== i))}
                aria-label={t("removePack", { name: pack.name })}
                className="size-11 md:size-9"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            {columns.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("packsNeedSizes")}
              </p>
            ) : (
              // Scrolls inside itself so a long run never scrolls the page.
              <div className="overflow-x-auto">
                <div className="flex items-start gap-1.5">
                  <div className="flex shrink-0 flex-col gap-1.5 pe-1 text-xs text-muted-foreground">
                    <span className="flex h-6 items-center">
                      {t("packSize")}
                    </span>
                    <span className="flex h-11 items-center md:h-9">
                      {t("packPairs")}
                    </span>
                  </div>
                  {columns.map((size) => {
                    const orphan = !sizes.includes(size);
                    return (
                      <div
                        key={size}
                        className="flex shrink-0 flex-col items-center gap-1.5"
                      >
                        <span
                          className={cn(
                            "flex h-6 items-center text-xs tabular-nums",
                            orphan
                              ? "font-semibold text-destructive"
                              : "text-muted-foreground",
                          )}
                        >
                          {size}
                        </span>
                        <Input
                          type="number"
                          min="0"
                          max="999"
                          inputMode="numeric"
                          dir="ltr"
                          value={pack.pairs[size] ?? ""}
                          onChange={(e) =>
                            update(i, {
                              ...pack,
                              pairs: { ...pack.pairs, [size]: e.target.value },
                            })
                          }
                          aria-label={t("packPairsFor", { size })}
                          aria-invalid={orphan}
                          className={cn(
                            "h-11 w-14 px-1 text-center font-medium md:h-9",
                            pairsOf(pack.pairs[size]) > 0 &&
                              "border-foreground/25",
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {t("packPairsTotal", { count: total })}
            </p>
            {error && (
              <p className="text-sm text-destructive">
                {error.key === "errorPackSizeNotInRun"
                  ? t(error.key, { sizes: error.sizes })
                  : t(error.key)}
              </p>
            )}
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={value.length >= MAX_PACKS}
        onClick={() => onChange([...value, { name: "", pairs: {} }])}
        className="h-11 self-start md:h-8"
      >
        <Plus className="size-4" />
        {t("addPack")}
      </Button>
      {value.length >= MAX_PACKS && (
        <p className="text-xs text-muted-foreground">
          {t("packsMax", { max: MAX_PACKS })}
        </p>
      )}
    </div>
  );
}

