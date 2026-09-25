"use server";

import { Prisma, prisma } from "@repo/db";
import {
  expandPack,
  MAX_LINE_PAIRS,
  orderSchema,
  parseCurve,
  recalculateOrderTotals,
  serializeCurve,
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

// Two creates at once (say, phone and computer) can both read the same last
// orderNumber; the loser trips @@unique([ownerId, orderNumber]) and simply
// takes the next number on a fresh attempt.
const ORDER_NUMBER_ATTEMPTS = 3;

function isUniqueViolation(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
  );
}

// A catalog pack deleted between resolvePacks reading it and the OrderPack
// insert pointing at it fails the foreign key. That's an expected outcome of
// a concurrent catalog edit, so it returns { ok: false } like any stale input
// rather than throwing, which would leave the form stuck on Save.
function isForeignKeyViolation(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003"
  );
}

export type OrderActionResult =
  | { ok: true; id: string }
  | { ok: false; error: "invalid" | "not_found" };

/** Ensure every referenced shoe model belongs to this owner. */
async function modelsAreValid(
  ownerId: string,
  input: OrderInput,
): Promise<boolean> {
  const ids = [
    ...input.items.map((i) => i.shoeModelId),
    ...input.packs.map((p) => p.shoeModelId),
  ].filter((id): id is string => !!id);
  if (ids.length === 0) return true;
  const unique = [...new Set(ids)];
  const count = await prisma.shoeModel.count({
    where: { id: { in: unique }, ownerId },
  });
  return count === unique.length;
}

/**
 * A pack ready to write: the name and curve are snapshots taken on the
 * server, never from the browser, and `items` is what they expand to.
 */
interface ResolvedPack {
  sizePackId: string | null;
  packName: string;
  curve: string;
  count: number;
  items: {
    shoeModelId: string;
    customDescription: null;
    size: string;
    color: string | null;
    quantity: number;
    unitPriceAgorot: number;
  }[];
}

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Build every pack's items from a stored curve. A new pack snapshots the
 * catalog pack, which must belong to the block's model *and* this owner. A
 * pack already on the order (edit only) reuses its own snapshot, so changing
 * the count on an old order never picks up a catalog pack edited since.
 * Returns null for anything that doesn't check out — the caller answers
 * `invalid`.
 */
async function resolvePacks(
  db: Db,
  ownerId: string,
  input: OrderInput,
  orderId?: string,
): Promise<ResolvedPack[] | null> {
  if (input.packs.length === 0) return [];

  const newIds = input.packs
    .filter((p) => !p.orderPackId)
    .map((p) => p.sizePackId!);
  const oldIds = input.packs
    .map((p) => p.orderPackId)
    .filter((id): id is string => !!id);
  // The same existing pack sent twice would be written twice.
  if (new Set(oldIds).size !== oldIds.length) return null;
  // A brand-new order has no packs of its own to refer to.
  if (oldIds.length > 0 && !orderId) return null;

  const [catalogPacks, orderPacks] = await Promise.all([
    newIds.length
      ? db.sizePack.findMany({
          where: { id: { in: newIds }, shoeModel: { ownerId } },
          select: { id: true, shoeModelId: true, name: true, curve: true },
        })
      : [],
    oldIds.length
      ? db.orderPack.findMany({
          where: { id: { in: oldIds }, order: { id: orderId, ownerId } },
          select: {
            id: true,
            sizePackId: true,
            packName: true,
            curve: true,
            items: { select: { shoeModelId: true }, take: 1 },
          },
        })
      : [],
  ]);
  const catalogById = new Map(catalogPacks.map((p) => [p.id, p]));
  const orderById = new Map(orderPacks.map((p) => [p.id, p]));

  const resolved: ResolvedPack[] = [];
  for (const pack of input.packs) {
    let source: { sizePackId: string | null; packName: string; curve: string };
    if (pack.orderPackId) {
      const old = orderById.get(pack.orderPackId);
      // A pack stays with the model it was taken for.
      if (!old || old.items[0]?.shoeModelId !== pack.shoeModelId) return null;
      source = { sizePackId: old.sizePackId, packName: old.packName, curve: old.curve };
    } else {
      const cat = catalogById.get(pack.sizePackId!);
      if (!cat || cat.shoeModelId !== pack.shoeModelId) return null;
      source = { sizePackId: cat.id, packName: cat.name, curve: cat.curve };
    }

    const curve = parseCurve(source.curve);
    const sizes = expandPack(curve, pack.count);
    // Each size is still one order line, so it gets the same typo guard as a
    // line typed by hand.
    if (sizes.length === 0 || sizes.some((s) => s.quantity > MAX_LINE_PAIRS))
      return null;
    resolved.push({
      ...source,
      curve: serializeCurve(curve),
      count: pack.count,
      items: sizes.map((s) => ({
        shoeModelId: pack.shoeModelId,
        customDescription: null,
        size: s.size,
        color: nullify(pack.color),
        quantity: s.quantity,
        unitPriceAgorot: pack.unitPriceAgorot,
      })),
    });
  }
  return resolved;
}

/** Write each pack and the items it expands to. */
async function createPacks(
  tx: Prisma.TransactionClient,
  orderId: string,
  packs: ResolvedPack[],
) {
  for (const { items, ...pack } of packs) {
    await tx.orderPack.create({
      data: {
        orderId,
        ...pack,
        items: { create: items.map((item) => ({ orderId, ...item })) },
      },
    });
  }
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
  const packs = await resolvePacks(prisma, ownerId, data);
  if (!packs) return { ok: false, error: "invalid" };

  // A new order has no Payment rows yet, so nothing is paid. depositAgorot is
  // left at its schema default and only ever set by the payment actions.
  // Totals count every pair: the loose items and the ones the packs expand to.
  const totals = recalculateOrderTotals(
    [...data.items, ...packs.flatMap((p) => p.items)],
    0,
  );
  const isCustomOrder = data.items.some((i) => !i.shoeModelId);

  const create = () =>
    prisma.$transaction(async (tx) => {
      const last = await tx.order.findFirst({
        where: { ownerId },
        orderBy: { orderNumber: "desc" },
        select: { orderNumber: true },
      });
      const orderNumber = (last?.orderNumber ?? 0) + 1;
      const created = await tx.order.create({
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
      await createPacks(tx, created.id, packs);
      return created;
    });

  let order: { id: string } | undefined;
  for (let attempt = 1; !order; attempt++) {
    try {
      order = await create();
    } catch (e) {
      if (isForeignKeyViolation(e)) return { ok: false, error: "invalid" };
      if (attempt >= ORDER_NUMBER_ATTEMPTS || !isUniqueViolation(e)) throw e;
    }
  }

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

  const save = () =>
    prisma.$transaction(async (tx) => {
      // Touch the row first to take its lock (updateMany, so a deleted order is
      // a count of 0, not a throw): a payment on this order then waits for this
      // save, or this save for it, so the deposit read below is current.
      // Postgres runs READ COMMITTED, where a plain read wouldn't block.
      await tx.order.updateMany({
        where: { id, ownerId },
        data: { updatedAt: new Date() },
      });
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
      if (!existingOrder) return "not_found" as const;
      // Read the order's current packs *before* anything is deleted: an existing
      // pack is rebuilt from its own saved snapshot, which the deletes below
      // would otherwise take with them.
      const packs = await resolvePacks(tx, ownerId, data, id);
      if (!packs) return "invalid" as const;
      const totals = recalculateOrderTotals(
        [...data.items, ...packs.flatMap((p) => p.items)],
        existingOrder.depositAgorot,
      );

      // Pack items cascade with their pack; the loose ones go with the first
      // delete. Both are rebuilt below.
      await tx.orderItem.deleteMany({ where: { orderId: id } });
      await tx.orderPack.deleteMany({ where: { orderId: id } });
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
      await createPacks(tx, id, packs);
      return "ok" as const;
    });

  let applied: Awaited<ReturnType<typeof save>>;
  try {
    applied = await save();
  } catch (e) {
    if (isForeignKeyViolation(e)) return { ok: false, error: "invalid" };
    throw e;
  }
  if (applied !== "ok") return { ok: false, error: applied };

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
