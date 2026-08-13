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

  // A new order has no Payment rows yet, so nothing is paid. depositAgorot is
  // left at its schema default and only ever set by the payment actions.
  const totals = recalculateOrderTotals(data.items, 0);
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

  const isCustomOrder = data.items.some((i) => !i.shoeModelId);

  const applied = await prisma.$transaction(async (tx) => {
    // Editing items changes the total, which changes the payment status — so
    // the deposit has to be re-read here rather than round-tripped through the
    // form, where it could be minutes stale. Read inside the transaction so a
    // payment landing mid-save can't be lost.
    // findUnique, not findUniqueOrThrow: this file returns { ok } for expected
    // failures rather than throwing, and the order can be deleted between the
    // ownership check above and this transaction. A rejection here would leave
    // the form's `pending` flag stuck with Save disabled and no toast.
    const existingOrder = await tx.order.findUnique({
      where: { id },
      select: { depositAgorot: true },
    });
    if (!existingOrder) return false;
    const totals = recalculateOrderTotals(data.items, existingOrder.depositAgorot);

    await tx.orderItem.deleteMany({ where: { orderId: id } });
    await tx.order.update({
      where: { id },
      data: {
        customerId: data.customerId,
        statusCode: data.statusCode,
        notes: nullify(data.notes),
        totalAgorot: totals.totalAgorot,
        paymentStatus: totals.paymentStatus,
        isCustomOrder,
        items: { create: itemCreateData(data) },
      },
    });
    return true;
  });
  if (!applied) return { ok: false, error: "not_found" };

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

/* -------------------------------------------------------------------------
   Bulk actions (orders list). The id list comes from the browser and is
   therefore untrusted — `ownerId` in the where clause is what makes a forged
   list harmless: it can only ever match rows this owner already owns.
   ------------------------------------------------------------------------- */

/** Selection is per-page, so a legitimate list stays small. */
const BULK_LIMIT = 200;

export type BulkOrderResult =
  | { ok: true; count: number }
  | { ok: false; error: "invalid" };

function validIds(ids: unknown): ids is string[] {
  return (
    Array.isArray(ids) &&
    ids.length > 0 &&
    ids.length <= BULK_LIMIT &&
    ids.every((id) => typeof id === "string" && id.length > 0)
  );
}

export async function setOrdersStatus(
  ids: string[],
  statusCode: string,
): Promise<BulkOrderResult> {
  const ownerId = await requireOwnerId();
  if (!validIds(ids)) return { ok: false, error: "invalid" };

  // Status codes live in the OrderStatus table so stages can be added without
  // a code change — validate against it rather than a hard-coded list.
  const known = await prisma.orderStatus.count({ where: { code: statusCode } });
  if (known === 0) return { ok: false, error: "invalid" };

  const result = await prisma.order.updateMany({
    where: { id: { in: ids }, ownerId },
    data: { statusCode },
  });
  revalidateOrderViews();
  return { ok: true, count: result.count };
}

export async function deleteOrders(ids: string[]): Promise<BulkOrderResult> {
  const ownerId = await requireOwnerId();
  if (!validIds(ids)) return { ok: false, error: "invalid" };

  // Items and payments cascade from Order in the schema, so this is complete.
  const result = await prisma.order.deleteMany({
    where: { id: { in: ids }, ownerId },
  });
  revalidateOrderViews();
  return { ok: true, count: result.count };
}
