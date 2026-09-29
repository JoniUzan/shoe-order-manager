import { describe, expect, it } from "vitest";

import {
  buildWhatsAppUrl,
  isValidWhatsAppPhone,
  normalizePhoneForWhatsApp,
} from "./phone";

describe("normalizePhoneForWhatsApp", () => {
  it.each([
    ["050-123-4567", "972501234567"],
    ["+972 50 123 4567", "972501234567"],
    ["00972501234567", "972501234567"],
    ["501234567", "972501234567"],
  ])("%s → %s", (raw, expected) => {
    expect(normalizePhoneForWhatsApp(raw)).toBe(expected);
  });

  it.each([null, undefined, "", "+123", "0012", "050"])("%j → null", (raw) => {
    expect(normalizePhoneForWhatsApp(raw)).toBeNull();
  });

  it("takes another country code", () => {
    expect(normalizePhoneForWhatsApp("0612345678", "31")).toBe("31612345678");
  });
});

describe("WhatsApp links", () => {
  it("validates and builds an encoded wa.me URL", () => {
    expect(isValidWhatsAppPhone("050-1234567")).toBe(true);
    expect(isValidWhatsAppPhone("12")).toBe(false);
    expect(buildWhatsAppUrl("050-1234567", "הזמנה #1 & more")).toBe(
      "https://wa.me/972501234567?text=%D7%94%D7%96%D7%9E%D7%A0%D7%94%20%231%20%26%20more",
    );
    expect(buildWhatsAppUrl("", "x")).toBeNull();
  });
});
