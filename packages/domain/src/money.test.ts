import { describe, expect, it } from "vitest";

import {
  agorotToShekels,
  formatMoney,
  formatMoneyCompact,
  parseShekelInput,
  shekelsToAgorot,
} from "./money";

describe("agorot ⇄ shekels", () => {
  it("converts both ways", () => {
    expect(agorotToShekels(12345)).toBe(123.45);
    expect(shekelsToAgorot(123.45)).toBe(12345);
  });

  it("rounds float noise to whole agorot", () => {
    // 0.1 + 0.2 = 0.30000000000000004
    expect(shekelsToAgorot(0.1 + 0.2)).toBe(30);
    expect(shekelsToAgorot(1.005)).toBe(100);
  });
});

describe("formatMoneyCompact", () => {
  it("shortens thousands and millions", () => {
    expect(formatMoneyCompact(4_000_000, "en")).toBe("₪40K");
    expect(formatMoneyCompact(150_000, "en")).toBe("₪1.5K");
    expect(formatMoneyCompact(125_000_000, "en")).toBe("₪1.3M");
    expect(formatMoneyCompact(0, "en")).toBe("₪0");
    // Where Hebrew puts the ₪ depends on the ICU data (Node 22 puts it last).
    const he = formatMoneyCompact(4_000_000, "he");
    expect(he).toContain("40K");
    expect(he).toContain("₪");
  });
});

describe("formatMoney", () => {
  it("formats ILS per locale", () => {
    expect(formatMoney(12345, "en")).toBe("₪123.45");
    const he = formatMoney(12345, "he");
    expect(he).toContain("123.45");
    expect(he).toContain("₪");
  });

  it("defaults to Hebrew", () => {
    expect(formatMoney(100)).toBe(formatMoney(100, "he"));
  });
});

describe("parseShekelInput", () => {
  it.each([
    ["123.45", 12345],
    ["1,234.5", 123450],
    ["₪ 20", 2000],
    ["0", 0],
    ["-5", -500],
  ])("%s → %d agorot", (input, agorot) => {
    expect(parseShekelInput(input)).toBe(agorot);
  });

  it.each(["", "-", ".", "abc", "1.2.3"])("%j → null", (input) => {
    expect(parseShekelInput(input)).toBeNull();
  });
});
