import { prisma } from "@repo/db";
import type { ShoeModelInput } from "@repo/domain";
import { describe, expect, it } from "vitest";

import { createCustomer, createUser } from "../../../test/factories";

import { createShoeModel, deleteShoeModel, updateShoeModel } from "./catalog";
import { createOrder } from "./orders";

const model = (packs: ShoeModelInput["packs"] = []): ShoeModelInput => ({
  name: "Runner",
  sizes: ["40", "38", "39"],
  sizeFormat: "eu",
  isActive: true,
  defaultPriceAgorot: 12_000,
  packs,
});

const packs = (ownerModelId: string) =>
  prisma.sizePack.findMany({
    where: { shoeModelId: ownerModelId },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, curve: true },
  });

describe("catalog", () => {
  it("stores canonical sizes and curves", async () => {
    await createUser();
    const r = await createShoeModel(
      model([{ name: "Mix", curve: [{ size: "40", pairs: 3 }, { size: "38.0", pairs: 3 }] }]),
    );
    if (!r.ok) throw new Error(r.error);
    const m = await prisma.shoeModel.findUniqueOrThrow({ where: { id: r.id } });
    expect(m.sizes).toBe("38,39,40");
    expect(await packs(r.id)).toMatchObject([{ name: "Mix", curve: "38:3,40:3" }]);
  });

  it("syncs packs on update: keeps, edits, adds and drops", async () => {
    await createUser();
    const r = await createShoeModel(
      model([
        { name: "A", curve: [{ size: "38", pairs: 1 }] },
        { name: "B", curve: [{ size: "39", pairs: 1 }] },
      ]),
    );
    if (!r.ok) throw new Error(r.error);
    const [a] = await packs(r.id);
    expect(
      await updateShoeModel(
        r.id,
        model([
          { id: a!.id, name: "A2", curve: [{ size: "38", pairs: 2 }] },
          // An id this model doesn't have is a new pack.
          { id: "cforeign", name: "C", curve: [{ size: "40", pairs: 1 }] },
        ]),
      ),
    ).toEqual({ ok: true, id: r.id });
    const after = await packs(r.id);
    expect(after.map((p) => [p.name, p.curve])).toEqual([
      ["A2", "38:2"],
      ["C", "40:1"],
    ]);
    expect(after[0]!.id).toBe(a!.id);
  });

  it("refuses invalid input, another User's model and a model in use", async () => {
    const user = await createUser();
    expect(await createShoeModel({ ...model(), name: "" })).toEqual({
      ok: false,
      error: "invalid",
    });
    const r = await createShoeModel(model());
    if (!r.ok) throw new Error(r.error);
    expect(await updateShoeModel(r.id, { ...model(), name: "" })).toEqual({
      ok: false,
      error: "invalid",
    });

    const customer = await createCustomer(user.id);
    await createOrder({
      customerId: customer.id,
      statusCode: "not_done",
      items: [{ shoeModelId: r.id, size: "38", quantity: 1, unitPriceAgorot: 1 }],
      packs: [],
    });
    expect(await deleteShoeModel(r.id)).toEqual({ ok: false, error: "in_use" });

    await createUser();
    expect(await updateShoeModel(r.id, model())).toEqual({ ok: false, error: "not_found" });
    expect(await deleteShoeModel(r.id)).toEqual({ ok: false, error: "not_found" });
  });

  it("deletes an unused model", async () => {
    await createUser();
    const r = await createShoeModel(model());
    if (!r.ok) throw new Error(r.error);
    expect(await deleteShoeModel(r.id)).toEqual({ ok: true, id: r.id });
  });
});
