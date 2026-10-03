"use server";

import { randomUUID } from "node:crypto";

import { prisma, type Prisma } from "@repo/db";
import {
  isOwnProductImageKey,
  looksLikeJpeg,
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_TYPE,
  productImageKey,
  serializeCurve,
  serializeSizes,
  shoeModelSchema,
  type ShoeModelInput,
} from "@repo/domain";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  deleteObjectQuietly,
  imageUrl,
  putObject,
  storageConfigured,
} from "@/lib/storage";

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

/**
 * Deletes an image the model just let go of, unless another of the User's
 * models still shows it (only a hand-made request could share one).
 */
async function dropImage(key: string) {
  if ((await prisma.shoeModel.count({ where: { imageKey: key } })) === 0) {
    await deleteObjectQuietly(key);
  }
}

/** Every view that shows a model's name or Product image. */
function revalidateCatalog() {
  revalidatePath("/catalog");
  revalidatePath("/orders");
}

export type UploadImageResult =
  | { ok: true; key: string; url: string | null }
  | { ok: false; error: "invalid" | "too_large" | "unavailable" };

/**
 * Stores a Product image and returns its key, which the form then saves with
 * the model. The browser has already cropped and scaled it to a square JPEG
 * (`squareCrop`); this only checks that it is one, and small.
 *
 * A form that is abandoned after the upload leaves the file unused. Uploads
 * happen when the model is saved, not when the photo is picked, to keep that
 * rare.
 */
export async function uploadProductImage(
  form: FormData,
): Promise<UploadImageResult> {
  const ownerId = await requireOwnerId();
  const file = form.get("image");
  if (!(file instanceof Blob)) return { ok: false, error: "invalid" };
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) return { ok: false, error: "too_large" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!looksLikeJpeg(bytes)) return { ok: false, error: "invalid" };
  if (!storageConfigured()) return { ok: false, error: "unavailable" };

  const key = productImageKey(ownerId, randomUUID());
  await putObject(key, bytes, PRODUCT_IMAGE_TYPE);
  return { ok: true, key, url: imageUrl(key) };
}

export async function createShoeModel(
  input: ShoeModelInput,
): Promise<CatalogActionResult> {
  const ownerId = await requireOwnerId();
  const parsed = shoeModelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  if (data.imageKey && !isOwnProductImageKey(ownerId, data.imageKey)) {
    return { ok: false, error: "invalid" };
  }

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
      imageKey: data.imageKey ?? null,
      // A nested create runs in the same transaction as the model's insert.
      packs: { create: data.packs.map((p, i) => packData(p, i)) },
    },
    select: { id: true },
  });

  revalidateCatalog();
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
  if (data.imageKey && !isOwnProductImageKey(ownerId, data.imageKey)) {
    return { ok: false, error: "invalid" };
  }

  const replaced = await prisma.$transaction(async (tx) => {
    // Lock the row first (the scoped update also proves ownership), so the
    // image read next is still the stored one when it is replaced: two saves
    // at once can't both delete the same old image and keep a dead key.
    const locked = await tx.shoeModel.updateMany({
      where: { id, ownerId },
      data: { updatedAt: new Date() },
    });
    if (locked.count === 0) return null;
    const before = await tx.shoeModel.findUniqueOrThrow({
      where: { id },
      select: { imageKey: true },
    });
    await tx.shoeModel.update({
      where: { id },
      data: {
        name: data.name,
        sku: nullify(data.sku),
        description: nullify(data.description),
        defaultPriceAgorot: data.defaultPriceAgorot ?? null,
        sizes: serializeSizes(data.sizes),
        sizeFormat: data.sizeFormat,
        isActive: data.isActive,
        // Left out of the input: the stored image stays.
        ...(data.imageKey !== undefined && { imageKey: data.imageKey }),
      },
    });
    // Only now are the packs (which have no ownerId of their own) touched.
    await syncPacks(tx, id, data.packs);
    // The image the update replaced or removed, deleted once this commits.
    const gone =
      data.imageKey !== undefined && before.imageKey !== data.imageKey
        ? before.imageKey
        : null;
    return { gone };
  });
  if (!replaced) return { ok: false, error: "not_found" };
  if (replaced.gone) await dropImage(replaced.gone);

  revalidateCatalog();
  return { ok: true, id };
}

export async function deleteShoeModel(
  id: string,
): Promise<CatalogActionResult> {
  const ownerId = await requireOwnerId();

  const model = await prisma.shoeModel.findFirst({
    where: { id, ownerId },
    select: { id: true, imageKey: true, _count: { select: { items: true } } },
  });
  if (!model) return { ok: false, error: "not_found" };
  if (model._count.items > 0) return { ok: false, error: "in_use" };

  await prisma.shoeModel.delete({ where: { id } });
  if (model.imageKey) await dropImage(model.imageKey);
  revalidateCatalog();
  return { ok: true, id };
}
