"use server";

import { prisma, type Prisma } from "@repo/db";
import { computePaymentStatus } from "@repo/domain";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth";

async function requireOwnerId(): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("unauthorized");
  return session.user.id;
}

export type PaymentActionResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "not_found" | "too_much" };

/**
 * Lock the order row and read its current money. Every payment transaction
 * starts here. Postgres runs READ COMMITTED, so without the lock two payments
 * landing at once (a double tap, or phone + computer) could both pass the
 * "not more than what's left" check and both sum without the other's row.
 * With it, the second waits for the first to commit, then reads its result.
 */
function lockOrder(tx: Prisma.TransactionClient, orderId: string) {
  return tx.order.update({
    where: { id: orderId },
    data: { updatedAt: new Date() },
    select: { totalAgorot: true, depositAgorot: true },
  });
}

/**
 * Recompute an order's denormalized payment fields (depositAgorot = sum of
 * payments, and paymentStatus) from its Payment rows. Runs inside a tx that
 * already holds the order's lock (lockOrder).
 */
async function recomputeOrderPayment(
  tx: Prisma.TransactionClient,
  orderId: string,
) {
  const agg = await tx.payment.aggregate({
    where: { orderId },
    _sum: { amountAgorot: true },
  });
  const paid = agg._sum.amountAgorot ?? 0;
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { totalAgorot: true },
  });
  await tx.order.update({
    where: { id: orderId },
    data: {
      depositAgorot: paid,
      paymentStatus: computePaymentStatus(order.totalAgorot, paid),
    },
  });
}

function revalidateOrderViews(orderId: string) {
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/customers");
  revalidatePath("/");
}

export async function recordPayment(
  orderId: string,
  amountAgorot: number,
  note?: string,
): Promise<PaymentActionResult> {
  const ownerId = await requireOwnerId();
  if (!Number.isFinite(amountAgorot) || amountAgorot <= 0) {
    return { ok: false, error: "invalid" };
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, ownerId },
    select: { id: true },
  });
  if (!order) return { ok: false, error: "not_found" };

  // The "too much" check runs on the locked, current deposit — checked before
  // the transaction, a concurrent payment could make it stale.
  const recorded = await prisma.$transaction(async (tx) => {
    const current = await lockOrder(tx, orderId);
    if (amountAgorot > current.totalAgorot - current.depositAgorot) return false;
    await tx.payment.create({
      data: {
        ownerId,
        orderId,
        amountAgorot,
        note: note?.trim() ? note.trim() : null,
      },
    });
    await recomputeOrderPayment(tx, orderId);
    return true;
  });
  if (!recorded) return { ok: false, error: "too_much" };

  revalidateOrderViews(orderId);
  return { ok: true };
}

export async function markFullyPaid(
  orderId: string,
): Promise<PaymentActionResult> {
  const ownerId = await requireOwnerId();
  const order = await prisma.order.findFirst({
    where: { id: orderId, ownerId },
    select: { id: true },
  });
  if (!order) return { ok: false, error: "not_found" };

  // "Remaining" is read under the lock, so a double tap pays it once: the
  // second transaction waits, then finds nothing left.
  await prisma.$transaction(async (tx) => {
    const current = await lockOrder(tx, orderId);
    const remaining = current.totalAgorot - current.depositAgorot;
    if (remaining <= 0) return;
    await tx.payment.create({
      data: { ownerId, orderId, amountAgorot: remaining },
    });
    await recomputeOrderPayment(tx, orderId);
  });

  revalidateOrderViews(orderId);
  return { ok: true };
}

export async function deletePayment(
  paymentId: string,
): Promise<PaymentActionResult> {
  const ownerId = await requireOwnerId();
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, ownerId },
    select: { id: true, orderId: true },
  });
  if (!payment) return { ok: false, error: "not_found" };

  await prisma.$transaction(async (tx) => {
    await lockOrder(tx, payment.orderId);
    await tx.payment.delete({ where: { id: paymentId } });
    await recomputeOrderPayment(tx, payment.orderId);
  });

  revalidateOrderViews(payment.orderId);
  return { ok: true };
}
