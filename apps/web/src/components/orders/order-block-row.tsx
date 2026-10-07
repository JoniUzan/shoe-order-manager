"use client";

import { formatMoney } from "@repo/domain";
import { cn } from "@repo/ui/lib/utils";
import { ChevronLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { ModelThumb } from "@/components/orders/model-thumb";
import type { ModelOption } from "@/components/orders/order-form";
import { roomy } from "@/components/step-form/roomy";
import {
  activePacks,
  blockAgorot,
  blockPairs,
  loosePairs,
  packCountOf,
  type BlockForm,
} from "@/lib/order-blocks";

/** How a block reads in one line: its name, and "Black · 4 cartons · 6 loose · 78 pairs". */
export function useBlockText(models: ModelOption[]) {
  const t = useTranslations("orders");

  return {
    name(block: BlockForm) {
      if (block.mode === "custom") return block.customDescription.trim() || t("addCustomItem");
      return models.find((m) => m.id === block.shoeModelId)?.name ?? t("selectModel");
    },
    /** The block's Product image: its model's, never a custom item's. */
    image(block: BlockForm) {
      if (block.mode === "custom") return null;
      return models.find((m) => m.id === block.shoeModelId)?.imageUrl ?? null;
    },
    /** Whether the block has its model or description yet (else `name` is a placeholder). */
    named(block: BlockForm) {
      return block.mode === "custom" ? !!block.customDescription.trim() : !!block.shoeModelId;
    },
    line(block: BlockForm) {
      const cartons = cartonsOf(block);
      const loose = loosePairs(block);
      return [
        block.color.trim(),
        block.material.trim(),
        block.sole.trim(),
        cartons > 0 && t("cartonsCount", { count: cartons }),
        cartons > 0 && loose > 0 && t("looseCount", { count: loose }),
        t("pairsCount", { count: blockPairs(block) }),
      ]
        .filter(Boolean)
        .join(" · ");
    },
  };
}

export const cartonsOf = (block: BlockForm) =>
  activePacks(block).reduce((n, p) => n + Math.max(0, packCountOf(p)), 0);

/**
 * A block folded to one line: its picture, name, what it holds and its
 * total. The whole row opens it for editing.
 */
export function OrderBlockRow({
  block,
  models,
  error,
  onOpen,
  className,
}: {
  block: BlockForm;
  models: ModelOption[];
  error?: string;
  onOpen: () => void;
  className?: string;
}) {
  const t = useTranslations("orders");
  const locale = useLocale();
  const text = useBlockText(models);
  const name = text.name(block);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={t("editModel", { name })}
        className={cn(
          "flex w-full items-center gap-3.5 rounded-[1.25rem] bg-card p-3 text-start shadow-[var(--shadow-card)]",
          "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          error && "ring-[1.5px] ring-destructive",
          roomy.press,
        )}
      >
        <ModelThumb src={text.image(block)} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className={cn("truncate font-semibold", !text.named(block) && "text-muted-foreground")}
          >
            {name}
          </span>
          <span className="truncate text-[0.8125rem] text-muted-foreground">{text.line(block)}</span>
        </span>
        <span className="font-semibold tabular-nums">{formatMoney(blockAgorot(block), locale)}</span>
        <ChevronLeft className="size-4.5 shrink-0 ltr:rotate-180" aria-hidden />
      </button>
      {error && (
        <p className={cn("ps-3 text-sm text-destructive", roomy.appear)}>{error}</p>
      )}
    </div>
  );
}
