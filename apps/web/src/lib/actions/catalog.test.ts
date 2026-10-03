import { prisma } from "@repo/db";
import type { ShoeModelInput } from "@repo/domain";
import { describe, expect, it } from "vitest";

import { createCustomer, createUser } from "../../../test/factories";

import { getObject } from "@/lib/storage";

import {
  createShoeModel,
  deleteShoeModel,
  updateShoeModel,
  uploadProductImage,
} from "./catalog";
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

/** Bytes that pass the JPEG check: the server doesn't decode the image. */
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);

function imageForm(bytes: Uint8Array<ArrayBuffer> = JPEG) {
  const form = new FormData();
  form.set("image", new Blob([bytes], { type: "image/jpeg" }), "photo.jpg");
  return form;
}

async function upload() {
  const r = await uploadProductImage(imageForm());
  if (!r.ok) throw new Error(r.error);
  return r.key;
}

describe("Product image", () => {
  it("stores an upload under the User and serves it at its URL", async () => {
    const user = await createUser();
    const r = await uploadProductImage(imageForm());
    if (!r.ok) throw new Error(r.error);
    expect(r.key).toMatch(new RegExp(`^products/${user.id}/[a-z0-9-]+\\.jpg$`));
    expect(await getObject(r.key)).toEqual(JPEG);
    const res = await fetch(r.url!);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(JPEG);
  });

  it("refuses a missing file, a non-JPEG and an oversized one", async () => {
    await createUser();
    expect(await uploadProductImage(new FormData())).toEqual({
      ok: false,
      error: "invalid",
    });
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    expect(await uploadProductImage(imageForm(png))).toEqual({
      ok: false,
      error: "invalid",
    });
    const big = new Uint8Array(1_500_001);
    big.set(JPEG);
    expect(await uploadProductImage(imageForm(big))).toEqual({
      ok: false,
      error: "too_large",
    });
  });

  it("saves the key with a new model, and refuses another User's", async () => {
    await createUser();
    const theirs = await upload();
    await createUser();
    const mine = await upload();

    const r = await createShoeModel({ ...model(), imageKey: mine });
    if (!r.ok) throw new Error(r.error);
    const m = await prisma.shoeModel.findUniqueOrThrow({ where: { id: r.id } });
    expect(m.imageKey).toBe(mine);

    expect(await createShoeModel({ ...model(), imageKey: theirs })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await updateShoeModel(r.id, { ...model(), imageKey: theirs })).toEqual({
      ok: false,
      error: "invalid",
    });
  });

  it("keeps the image when left out, and deletes the old one on replace and remove", async () => {
    await createUser();
    const first = await upload();
    const r = await createShoeModel({ ...model(), imageKey: first });
    if (!r.ok) throw new Error(r.error);
    const imageKey = async () =>
      (await prisma.shoeModel.findUniqueOrThrow({ where: { id: r.id } })).imageKey;

    await updateShoeModel(r.id, { ...model(), name: "Runner 2" });
    expect(await imageKey()).toBe(first);
    expect(await getObject(first)).not.toBeNull();

    const second = await upload();
    await updateShoeModel(r.id, { ...model(), imageKey: second });
    expect(await imageKey()).toBe(second);
    expect(await getObject(first)).toBeNull();

    await updateShoeModel(r.id, { ...model(), imageKey: null });
    expect(await imageKey()).toBeNull();
    expect(await getObject(second)).toBeNull();
  });

  it("deletes the image with its model, unless another model still shows it", async () => {
    await createUser();
    const key = await upload();
    const a = await createShoeModel({ ...model(), imageKey: key });
    const b = await createShoeModel({ ...model(), imageKey: key });
    if (!a.ok || !b.ok) throw new Error("create failed");

    await deleteShoeModel(a.id);
    expect(await getObject(key)).not.toBeNull();
    await deleteShoeModel(b.id);
    expect(await getObject(key)).toBeNull();
  });

  it("leaves another User's model and image alone", async () => {
    await createUser();
    const key = await upload();
    const r = await createShoeModel({ ...model(), imageKey: key });
    if (!r.ok) throw new Error(r.error);

    await createUser();
    expect(await updateShoeModel(r.id, { ...model(), imageKey: null })).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(await deleteShoeModel(r.id)).toEqual({ ok: false, error: "not_found" });
    expect(await getObject(key)).not.toBeNull();
  });
});
