import { describe, expect, it } from "vitest";

import { shoeModelSchema } from "./catalog";
import {
  isOwnProductImageKey,
  isProductImageKey,
  looksLikeJpeg,
  productImageKey,
  squareCrop,
} from "./product-image";

const OWNER = "cm1abcdefghijklmnop";
const NAME = "0f8e2c3a-4b5d-4e6f-8a9b-0c1d2e3f4a5b";

describe("productImageKey", () => {
  it("puts the image under its owner with a .jpg name", () => {
    expect(productImageKey(OWNER, NAME)).toBe(`products/${OWNER}/${NAME}.jpg`);
  });

  it("makes keys that pass the shape check", () => {
    expect(isProductImageKey(productImageKey(OWNER, NAME))).toBe(true);
  });
});

describe("isProductImageKey", () => {
  it.each([
    ["no folder", `${NAME}.jpg`],
    ["another folder", `avatars/${OWNER}/${NAME}.jpg`],
    ["a path climbing out", `products/${OWNER}/../${NAME}.jpg`],
    ["another extension", `products/${OWNER}/${NAME}.png`],
    ["a short guessable name", `products/${OWNER}/1.jpg`],
    ["an owner that isn't a cuid", `products/admin/${NAME}.jpg`],
    ["a full URL", `https://cdn.example.com/products/${OWNER}/${NAME}.jpg`],
  ])("refuses %s", (_, key) => {
    expect(isProductImageKey(key)).toBe(false);
  });
});

describe("isOwnProductImageKey", () => {
  it("accepts the owner's own key", () => {
    expect(isOwnProductImageKey(OWNER, productImageKey(OWNER, NAME))).toBe(true);
  });

  it("refuses another User's key", () => {
    expect(
      isOwnProductImageKey("cm9zzzzzzzzzzzzzzzz", productImageKey(OWNER, NAME)),
    ).toBe(false);
  });

  it("refuses a malformed key", () => {
    expect(isOwnProductImageKey(OWNER, `products/${OWNER}/x.jpg`)).toBe(false);
  });
});

describe("looksLikeJpeg", () => {
  it("accepts the JPEG start of image marker", () => {
    expect(looksLikeJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]))).toBe(true);
  });

  it("refuses a PNG", () => {
    expect(looksLikeJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe(false);
  });

  it("refuses something too short to tell", () => {
    expect(looksLikeJpeg(new Uint8Array([0xff, 0xd8]))).toBe(false);
  });
});

describe("squareCrop", () => {
  it("takes the centre of a landscape photo", () => {
    expect(squareCrop(4000, 3000)).toEqual({ sx: 500, sy: 0, side: 3000, out: 1024 });
  });

  it("takes the centre of a portrait photo", () => {
    expect(squareCrop(3000, 4001)).toEqual({ sx: 0, sy: 500, side: 3000, out: 1024 });
  });

  it("never scales a small photo up", () => {
    expect(squareCrop(600, 800)).toEqual({ sx: 0, sy: 100, side: 600, out: 600 });
  });
});

describe("shoeModelSchema imageKey", () => {
  const base = { name: "Runner" };

  it("is optional", () => {
    expect(shoeModelSchema.safeParse(base).success).toBe(true);
  });

  it("accepts null, which removes the image", () => {
    expect(shoeModelSchema.safeParse({ ...base, imageKey: null }).success).toBe(true);
  });

  it("accepts a Product image key", () => {
    const imageKey = productImageKey(OWNER, NAME);
    expect(shoeModelSchema.safeParse({ ...base, imageKey }).success).toBe(true);
  });

  it("refuses anything else", () => {
    const res = shoeModelSchema.safeParse({ ...base, imageKey: "../../etc/passwd" });
    expect(res.success).toBe(false);
  });
});
