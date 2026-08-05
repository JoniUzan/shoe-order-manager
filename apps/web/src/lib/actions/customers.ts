"use server";

import { prisma } from "@repo/db";
import { customerSchema, type CustomerInput } from "@repo/domain";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";

async function requireOwnerId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthorized");
  return session.user.id;
}

/** Trim a string field; empty becomes null for optional DB columns. */
function nullify(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export type CustomerActionResult =
  | { ok: true; id: string }
  | { ok: false; error: "invalid" | "not_found" | "has_orders" };

export async function createCustomer(
  input: CustomerInput,
): Promise<CustomerActionResult> {
  const ownerId = await requireOwnerId();
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;

  const customer = await prisma.customer.create({
    data: {
      ownerId,
      name: data.name,
      contactName: nullify(data.contactName),
      phone: nullify(data.phone),
      address: nullify(data.address),
      notes: nullify(data.notes),
    },
    select: { id: true },
  });

  revalidatePath("/customers");
  return { ok: true, id: customer.id };
}

export async function updateCustomer(
  id: string,
  input: CustomerInput,
): Promise<CustomerActionResult> {
  const ownerId = await requireOwnerId();
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;

  const result = await prisma.customer.updateMany({
    where: { id, ownerId },
    data: {
      name: data.name,
      contactName: nullify(data.contactName),
      phone: nullify(data.phone),
      address: nullify(data.address),
      notes: nullify(data.notes),
    },
  });
  if (result.count === 0) return { ok: false, error: "not_found" };

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return { ok: true, id };
}

export async function deleteCustomer(
  id: string,
): Promise<CustomerActionResult> {
  const ownerId = await requireOwnerId();

  const customer = await prisma.customer.findFirst({
    where: { id, ownerId },
    select: { id: true, _count: { select: { orders: true } } },
  });
  if (!customer) return { ok: false, error: "not_found" };
  if (customer._count.orders > 0) return { ok: false, error: "has_orders" };

  await prisma.customer.delete({ where: { id } });
  revalidatePath("/customers");
  return { ok: true, id };
}
