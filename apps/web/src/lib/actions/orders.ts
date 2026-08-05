"use server";

import { prisma } from "@repo/db";
import {
  orderSchema,
  recalculateOrderTotals,
  type OrderInput,
} from "@repo/domain";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";

async function requireOwnerId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthorized");
  return session.user.id;
}

function nullify(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export type OrderActionResult =
  | { ok: true; id: string }
  | { ok: false; error: "invalid" | "not_found" };

/** Ensure every referenced shoe model belongs to this owner. */
async function modelsAreValid(
  ownerId: string,
  input: OrderInput,
): Promise<boolean> {
  const ids = input.items
    .map((i) => i.shoeModelId)
    .filter((id): id is string => !!id);
  if (ids.length === 0) return true;
  const unique = [...new Set(ids)];
  const count = await prisma.shoeModel.count({
    where: { id: { in: unique }, ownerId },
  });
  return count === unique.length;
}

function itemCreateData(input: OrderInput) {
  return input.items.map((i) => ({
    shoeModelId: i.shoeModelId ?? null,
    customDescription: i.customDescription ?? null,
    size: i.size,
    color: nullify(i.color),
    quantity: i.quantity,
    unitPriceAgorot: i.unitPriceAgorot,
  }));
}

function revalidateOrderViews(id?: string) {
  revalidatePath("/orders");
  revalidatePath("/customers");
  revalidatePath("/");
  if (id) revalidatePath(`/orders/${id}`);
}

export async function createOrder(
  input: OrderInput,
): Promise<OrderActionResult> {
  const ownerId = await requireOwnerId();
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;

  const customer = await prisma.customer.findFirst({
    where: { id: data.customerId, ownerId },
    select: { id: true },
  });
  if (!customer) return { ok: false, error: "invalid" };
  if (!(await modelsAreValid(ownerId, data)))
    return { ok: false, error: "invalid" };

  const totals = recalculateOrderTotals(data.items, data.depositAgorot);
  const isCustomOrder = data.items.some((i) => !i.shoeModelId);

  const order = await prisma.$transaction(async (tx) => {
    const last = await tx.order.findFirst({
      where: { ownerId },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });
    const orderNumber = (last?.orderNumber ?? 0) + 1;
    return tx.order.create({
      data: {
        ownerId,
        customerId: data.customerId,
        orderNumber,
        statusCode: data.statusCode,
        notes: nullify(data.notes),
        totalAgorot: totals.totalAgorot,
        depositAgorot: data.depositAgorot,
        paymentStatus: totals.paymentStatus,
        isCustomOrder,
        items: { create: itemCreateData(data) },
      },
      select: { id: true },
    });
  });

  revalidateOrderViews();
  return { ok: true, id: order.id };
}

export async function updateOrder(
  id: string,
  input: OrderInput,
): Promise<OrderActionResult> {
  const ownerId = await requireOwnerId();
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;

  const existing = await prisma.order.findFirst({
    where: { id, ownerId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "not_found" };

  const customer = await prisma.customer.findFirst({
    where: { id: data.customerId, ownerId },
    select: { id: true },
  });
  if (!customer) return { ok: false, error: "invalid" };
  if (!(await modelsAreValid(ownerId, data)))
    return { ok: false, error: "invalid" };

  const totals = recalculateOrderTotals(data.items, data.depositAgorot);
  const isCustomOrder = data.items.some((i) => !i.shoeModelId);

  await prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({ where: { orderId: id } });
    await tx.order.update({
      where: { id },
      data: {
        customerId: data.customerId,
        statusCode: data.statusCode,
        notes: nullify(data.notes),
        totalAgorot: totals.totalAgorot,
        depositAgorot: data.depositAgorot,
        paymentStatus: totals.paymentStatus,
        isCustomOrder,
        items: { create: itemCreateData(data) },
      },
    });
  });

  revalidateOrderViews(id);
  return { ok: true, id };
}

export async function deleteOrder(id: string): Promise<OrderActionResult> {
  const ownerId = await requireOwnerId();
  const result = await prisma.order.deleteMany({ where: { id, ownerId } });
  if (result.count === 0) return { ok: false, error: "not_found" };
  revalidateOrderViews(id);
  return { ok: true, id };
}

export async function setOrderStatus(
  id: string,
  statusCode: string,
): Promise<OrderActionResult> {
  const ownerId = await requireOwnerId();
  const result = await prisma.order.updateMany({
    where: { id, ownerId },
    data: { statusCode },
  });
  if (result.count === 0) return { ok: false, error: "not_found" };
  revalidateOrderViews(id);
  return { ok: true, id };
}
