"use server";

import { prisma, type Prisma } from "@repo/db";
import { computePaymentStatus } from "@repo/domain";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";

async function requireOwnerId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthorized");
  return session.user.id;
}

export type PaymentActionResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "not_found" | "too_much" };

/**
 * Recompute an order's denormalized payment fields (depositAgorot = sum of
 * payments, and paymentStatus) from its Payment rows. Runs inside a tx.
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
    select: { totalAgorot: true, depositAgorot: true },
  });
  if (!order) return { ok: false, error: "not_found" };

  const remaining = order.totalAgorot - order.depositAgorot;
  if (amountAgorot > remaining) return { ok: false, error: "too_much" };

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        ownerId,
        orderId,
        amountAgorot,
        note: note?.trim() ? note.trim() : null,
      },
    });
    await recomputeOrderPayment(tx, orderId);
  });

  revalidateOrderViews(orderId);
  return { ok: true };
}

export async function markFullyPaid(
  orderId: string,
): Promise<PaymentActionResult> {
  const ownerId = await requireOwnerId();
  const order = await prisma.order.findFirst({
    where: { id: orderId, ownerId },
    select: { totalAgorot: true, depositAgorot: true },
  });
  if (!order) return { ok: false, error: "not_found" };

  const remaining = order.totalAgorot - order.depositAgorot;
  if (remaining <= 0) return { ok: true };

  await prisma.$transaction(async (tx) => {
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
    await tx.payment.delete({ where: { id: paymentId } });
    await recomputeOrderPayment(tx, payment.orderId);
  });

  revalidateOrderViews(payment.orderId);
  return { ok: true };
}
