"use server";

import { prisma } from "@repo/db";
import {
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

  const result = await prisma.shoeModel.updateMany({
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
  if (result.count === 0) return { ok: false, error: "not_found" };

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
