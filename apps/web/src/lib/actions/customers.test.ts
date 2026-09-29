import { prisma } from "@repo/db";
import { describe, expect, it } from "vitest";

import { createUser } from "../../../test/factories";
import { signInAs } from "../../../test/session";

import { createCustomer, deleteCustomer, updateCustomer } from "./customers";
import { createOrder } from "./orders";

describe("customers", () => {
  it("creates, updates and deletes, trimming blanks to null", async () => {
    await createUser();
    const r = await createCustomer({ name: "Store", phone: "  ", contactName: " Dana " });
    if (!r.ok) throw new Error(r.error);
    expect(await prisma.customer.findUniqueOrThrow({ where: { id: r.id } })).toMatchObject({
      name: "Store",
      phone: null,
      contactName: "Dana",
    });

    expect(await updateCustomer(r.id, { name: "Store 2" })).toEqual({ ok: true, id: r.id });
    expect(await updateCustomer(r.id, { name: "" })).toEqual({ ok: false, error: "invalid" });
    expect(await createCustomer({ name: "" })).toEqual({ ok: false, error: "invalid" });
    expect(await deleteCustomer(r.id)).toEqual({ ok: true, id: r.id });
    expect(await deleteCustomer(r.id)).toEqual({ ok: false, error: "not_found" });
  });

  it("won't delete a Customer with orders", async () => {
    await createUser();
    const c = await createCustomer({ name: "Store" });
    if (!c.ok) throw new Error(c.error);
    await createOrder({
      customerId: c.id,
      statusCode: "not_done",
      items: [{ customDescription: "x", size: "40", quantity: 1, unitPriceAgorot: 1 }],
      packs: [],
    });
    expect(await deleteCustomer(c.id)).toEqual({ ok: false, error: "has_orders" });
  });

  it("is scoped to the owner", async () => {
    const owner = await createUser();
    const c = await createCustomer({ name: "Mine" });
    if (!c.ok) throw new Error(c.error);
    await createUser();
    expect(await updateCustomer(c.id, { name: "Stolen" })).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(await deleteCustomer(c.id)).toEqual({ ok: false, error: "not_found" });
    signInAs(owner.id);
    expect((await prisma.customer.findUniqueOrThrow({ where: { id: c.id } })).name).toBe("Mine");
  });
});
