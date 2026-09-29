import { describe, expect, it } from "vitest";

import {
  canonicalSizes,
  curvePairs,
  expandPack,
  expandSizeRange,
  formatCurve,
  formatSize,
  isSizeFormat,
  MAX_SIZES,
  normalizeSize,
  parseCurve,
  parseSizes,
  serializeCurve,
  serializeSizes,
  shoeModelSchema,
  sizePackSchema,
  sizeSchema,
} from "./catalog";

describe("size formats", () => {
  it("labels known formats and falls back to the bare size", () => {
    expect(isSizeFormat("eu")).toBe(true);
    expect(isSizeFormat("xx")).toBe(false);
    expect(isSizeFormat(3)).toBe(false);
    expect(formatSize("42", "eu")).toBe("EU 42");
    expect(formatSize("42", null)).toBe("42");
  });
});

describe("sizeSchema", () => {
  it.each([
    ["", "size_empty"],
    ["40,41", "size_no_comma"],
    ["M", "size_numeric"],
    ["0", "size_positive"],
  ])("%j → %s", (input, message) => {
    expect(sizeSchema.safeParse(input).error?.issues[0]?.message).toBe(message);
  });

  it("accepts half sizes", () => {
    expect(sizeSchema.parse(" 42.5 ")).toBe("42.5");
  });
});

describe("sizes", () => {
  it("normalizes to the shortest spelling", () => {
    expect(normalizeSize("42.0")).toBe("42");
    expect(normalizeSize("42.50")).toBe("42.5");
    expect(normalizeSize("abc")).toBe("");
    expect(normalizeSize("-1")).toBe("");
    expect(normalizeSize("  ")).toBe("");
  });

  it("parses tolerantly and dedupes, keeping stored order", () => {
    expect(parseSizes("40,39,40.0,abc,,41")).toEqual(["40", "39", "41"]);
    expect(parseSizes(null)).toEqual([]);
  });

  it("serializes sorted, or null when empty", () => {
    expect(canonicalSizes(["41", "39.5", "40"])).toEqual(["39.5", "40", "41"]);
    expect(serializeSizes(["41", "39", "41"])).toBe("39,41");
    expect(serializeSizes(["x"])).toBeNull();
  });

  it("expands a range without float drift", () => {
    expect(expandSizeRange(40, 42, 0.5)).toEqual([
      "40",
      "40.5",
      "41",
      "41.5",
      "42",
    ]);
    expect(expandSizeRange(-1, 1, 1)).toEqual(["1"]);
    expect(expandSizeRange(42, 40, 1)).toEqual([]);
    expect(expandSizeRange(NaN, 40, 1)).toEqual([]);
    expect(expandSizeRange(1, 1000, 1)).toHaveLength(MAX_SIZES);
  });
});

describe("pack curves", () => {
  it("parses tolerantly, summing repeats and sorting", () => {
    expect(parseCurve("40:3,38:3,39:2,38.0:1,bad,41:0,42:x")).toEqual([
      { size: "38", pairs: 4 },
      { size: "39", pairs: 2 },
      { size: "40", pairs: 3 },
    ]);
    expect(parseCurve(undefined)).toEqual([]);
  });

  it("round-trips to the canonical string", () => {
    expect(
      serializeCurve([
        { size: "40", pairs: 3 },
        { size: "39", pairs: 0 },
        { size: "38.0", pairs: 3 },
      ]),
    ).toBe("38:3,40:3");
  });

  it("counts pairs and expands cartons", () => {
    const curve = parseCurve("38:3,39:2,40:3");
    expect(curvePairs(curve)).toBe(8);
    expect(expandPack(curve, 5)).toEqual([
      { size: "38", quantity: 15 },
      { size: "39", quantity: 10 },
      { size: "40", quantity: 15 },
    ]);
    expect(expandPack([{ size: "41", pairs: 0 }], 2)).toEqual([]);
    expect(formatCurve(curve)).toBe("38×3 · 39×2 · 40×3");
  });
});

describe("sizePackSchema", () => {
  it("refuses an empty pack and repeated sizes", () => {
    const empty = sizePackSchema.safeParse({
      name: "A",
      curve: [{ size: "40", pairs: 0 }],
    });
    expect(empty.error?.issues[0]?.message).toBe("pack_empty");
    const dup = sizePackSchema.safeParse({
      name: "A",
      curve: [
        { size: "40", pairs: 1 },
        { size: "40.0", pairs: 1 },
      ],
    });
    expect(dup.error?.issues[0]?.message).toBe("pack_duplicate_size");
  });
});

describe("shoeModelSchema", () => {
  const pack = (name: string, size = "40") => ({
    name,
    curve: [{ size, pairs: 2 }],
  });

  it("applies defaults", () => {
    const m = shoeModelSchema.parse({ name: "Runner" });
    expect(m).toMatchObject({ sizes: [], sizeFormat: "eu", isActive: true, packs: [] });
  });

  it("refuses a pack size outside the run", () => {
    const r = shoeModelSchema.safeParse({
      name: "Runner",
      sizes: ["39"],
      packs: [pack("A", "40")],
    });
    expect(r.error?.issues[0]).toMatchObject({
      message: "pack_size_not_in_run",
      path: ["packs", 0, "curve"],
    });
  });

  it("refuses two packs with the same name, ignoring case", () => {
    const r = shoeModelSchema.safeParse({
      name: "Runner",
      sizes: ["40"],
      packs: [pack("Mix"), pack(" mix ")],
    });
    expect(r.error?.issues[0]).toMatchObject({
      message: "pack_name_duplicate",
      path: ["packs", 1, "name"],
    });
  });
});
