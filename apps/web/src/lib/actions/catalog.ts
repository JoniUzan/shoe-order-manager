"use server";

import { prisma, type Prisma } from "@repo/db";
import {
  serializeCurve,
  serializeSizes,
  shoeModelSchema,
  type ShoeModelInput,
} from "@repo/domain";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";

async function requireOwnerId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthorized");
  return session.user.id;
}

function nullify(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** A pack's stored columns; its position in the form is its sort order. */
function packData(pack: ShoeModelInput["packs"][number], sortOrder: number) {
  return { name: pack.name, curve: serializeCurve(pack.curve), sortOrder };
}

/**
 * Bring a model's packs in line with the form: update the ones it sent back
 * (by id, and only if they belong to this model), create the new ones, delete
 * the rest. A deleted pack's OrderPack rows keep their name and curve
 * snapshot; only their `sizePackId` goes null (SetNull in the schema).
 */
async function syncPacks(
  tx: Prisma.TransactionClient,
  shoeModelId: string,
  packs: ShoeModelInput["packs"],
) {
  const existing = await tx.sizePack.findMany({
    where: { shoeModelId },
    select: { id: true },
  });
  const known = new Set(existing.map((p) => p.id));
  const kept = new Set(
    packs.map((p) => p.id).filter((id): id is string => !!id && known.has(id)),
  );

  await tx.sizePack.deleteMany({
    where: { shoeModelId, id: { notIn: [...kept] } },
  });
  for (const [i, pack] of packs.entries()) {
    if (pack.id && kept.has(pack.id)) {
      await tx.sizePack.update({
        where: { id: pack.id },
        data: packData(pack, i),
      });
    } else {
      // An id we don't know (stale tab, another model's pack) is treated as
      // a new pack rather than trusted.
      await tx.sizePack.create({ data: { shoeModelId, ...packData(pack, i) } });
    }
  }
}

export type CatalogActionResult =
  | { ok: true; id: string }
  | { ok: false; error: "invalid" | "not_found" | "in_use" };

export async function createShoeModel(
  input: ShoeModelInput,
): Promise<CatalogActionResult> {
  const ownerId = await requireOwnerId();
  const parsed = shoeModelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;

  const model = await prisma.shoeModel.create({
    data: {
      ownerId,
      name: data.name,
      sku: nullify(data.sku),
      description: nullify(data.description),
      defaultPriceAgorot: data.defaultPriceAgorot ?? null,
      sizes: serializeSizes(data.sizes),
      sizeFormat: data.sizeFormat,
      isActive: data.isActive,
      // A nested create runs in the same transaction as the model's insert.
      packs: { create: data.packs.map((p, i) => packData(p, i)) },
    },
    select: { id: true },
  });

  revalidatePath("/catalog");
  return { ok: true, id: model.id };
}

export async function updateShoeModel(
  id: string,
  input: ShoeModelInput,
): Promise<CatalogActionResult> {
  const ownerId = await requireOwnerId();
  const parsed = shoeModelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;

  const applied = await prisma.$transaction(async (tx) => {
    const result = await tx.shoeModel.updateMany({
      where: { id, ownerId },
      data: {
        name: data.name,
        sku: nullify(data.sku),
        description: nullify(data.description),
        defaultPriceAgorot: data.defaultPriceAgorot ?? null,
        sizes: serializeSizes(data.sizes),
        sizeFormat: data.sizeFormat,
        isActive: data.isActive,
      },
    });
    // Ownership is proven by the scoped update above; only then are the
    // packs (which have no ownerId of their own) touched.
    if (result.count === 0) return false;
    await syncPacks(tx, id, data.packs);
    return true;
  });
  if (!applied) return { ok: false, error: "not_found" };

  revalidatePath("/catalog");
  return { ok: true, id };
}

export async function deleteShoeModel(
  id: string,
): Promise<CatalogActionResult> {
  const ownerId = await requireOwnerId();

  const model = await prisma.shoeModel.findFirst({
    where: { id, ownerId },
    select: { id: true, _count: { select: { items: true } } },
  });
  if (!model) return { ok: false, error: "not_found" };
  if (model._count.items > 0) return { ok: false, error: "in_use" };

  await prisma.shoeModel.delete({ where: { id } });
  revalidatePath("/catalog");
  return { ok: true, id };
}
