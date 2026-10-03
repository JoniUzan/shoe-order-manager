"use client";

import { agorotToShekels, MAX_PACK_COUNT, normalizeSize } from "@repo/domain";
import type { UseFormReturn } from "react-hook-form";

import type { ModelOption } from "@/components/orders/order-form";
import {
  pairsOf,
  packCountOf,
  type OrderFormValues,
  type PackRow,
  type SizeRow,
} from "@/lib/order-blocks";

/**
 * The edits a model block takes: choosing its model, Packs and their Cartons,
 * size columns. Shared by the editor on a computer and the sheet on a phone.
 */
export function useOrderBlocks(
  form: UseFormReturn<OrderFormValues>,
  models: ModelOption[],
) {
  function modelPacks(modelId: string | undefined) {
    return models.find((m) => m.id === modelId)?.packs ?? [];
  }

  /**
   * Rewriting the whole rows array is the only way to add or drop a column, so
   * it must start from the *live* values. A render snapshot can trail the last
   * keystroke, and writing it back would reset pairs the user had just typed
   * while the uncontrolled inputs kept showing them.
   */
  function currentRows(index: number): SizeRow[] {
    return form.getValues(`blocks.${index}.rows`) ?? [];
  }

  function setRows(index: number, rows: SizeRow[]) {
    form.setValue(`blocks.${index}.rows`, rows, { shouldDirty: true });
    // Errors are keyed by row index and RHF doesn't shift them on setValue:
    // removing column 0 would leave its error on the column that slid in.
    form.clearErrors(`blocks.${index}.rows`);
  }

  function currentPacks(index: number): PackRow[] {
    return form.getValues(`blocks.${index}.packs`) ?? [];
  }

  function setPacks(index: number, packs: PackRow[]) {
    form.setValue(`blocks.${index}.packs`, packs, { shouldDirty: true });
    // Same as setRows; and the "no pairs" error may no longer apply.
    form.clearErrors(`blocks.${index}.packs`);
    form.clearErrors(`blocks.${index}.rows`);
  }

  /** Catalog packs of this model not yet taken by another pack row. */
  function freePacks(index: number) {
    const block = form.getValues(`blocks.${index}`);
    const taken = new Set((block?.packs ?? []).map((p) => p.sizePackId).filter(Boolean));
    return modelPacks(block?.shoeModelId).filter((p) => !taken.has(p.id));
  }

  return {
    modelPacks,
    freePacks,

    /** Adds the next free Pack with one Carton. Returns false if none is left. */
    addPack(index: number) {
      const next = freePacks(index)[0];
      if (!next) return false;
      setPacks(index, [
        ...currentPacks(index),
        { sizePackId: next.id, packName: next.name, curve: next.curve, count: "1" },
      ]);
      return true;
    },

    choosePack(index: number, k: number, sizePackId: string) {
      const pack = modelPacks(form.getValues(`blocks.${index}.shoeModelId`)).find(
        (p) => p.id === sizePackId,
      );
      if (!pack) return;
      setPacks(
        index,
        currentPacks(index).map((row, i) =>
          i === k ? { ...row, sizePackId: pack.id, packName: pack.name, curve: pack.curve } : row,
        ),
      );
    },

    removePack(index: number, k: number) {
      setPacks(
        index,
        currentPacks(index).filter((_, i) => i !== k),
      );
    },

    /** One Carton more or less, kept between 1 and the maximum. */
    stepCartons(index: number, k: number, by: 1 | -1) {
      const pack = currentPacks(index)[k];
      if (!pack) return;
      const next = Math.min(MAX_PACK_COUNT, Math.max(1, packCountOf(pack) + by));
      form.setValue(`blocks.${index}.packs.${k}.count`, String(next), { shouldDirty: true });
      form.clearErrors(`blocks.${index}.packs.${k}`);
      form.clearErrors(`blocks.${index}.rows`);
    },

    chooseModel(index: number, modelId: string) {
      const model = models.find((m) => m.id === modelId);
      const previous = form.getValues(`blocks.${index}.shoeModelId`);
      form.setValue(`blocks.${index}.shoeModelId`, modelId, { shouldDirty: true });
      form.clearErrors(`blocks.${index}.shoeModelId`);
      // A pack is a box of one particular model: it can't follow the block to another.
      if (modelId !== previous && currentPacks(index).length > 0) setPacks(index, []);

      if (model?.defaultPriceAgorot != null && !form.getValues(`blocks.${index}.unitPrice`)) {
        form.setValue(
          `blocks.${index}.unitPrice`,
          String(agorotToShekels(model.defaultPriceAgorot)),
        );
      }

      const catalogSizes = model?.sizes ?? [];
      const current = currentRows(index);
      // Nothing typed yet: take the new model's run. Once pairs exist, keep
      // them and append only the sizes this model adds (compared normalised,
      // so a typed "42.0" is the catalog's "42").
      if (current.every((row) => pairsOf(row) <= 0)) {
        setRows(index, catalogSizes.map((size) => ({ size, pairs: "" })));
      } else {
        const seen = new Set(current.map((row) => normalizeSize(row.size)));
        setRows(index, [
          ...current,
          ...catalogSizes.filter((size) => !seen.has(size)).map((size) => ({ size, pairs: "" })),
        ]);
      }
    },

    addSize(index: number) {
      setRows(index, [...currentRows(index), { size: "", pairs: "" }]);
    },

    removeSize(index: number, j: number) {
      setRows(
        index,
        currentRows(index).filter((_, k) => k !== j),
      );
    },
  };
}

export type OrderBlocks = ReturnType<typeof useOrderBlocks>;
