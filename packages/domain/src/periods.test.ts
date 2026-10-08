import { describe, expect, it } from "vitest";

import {
  dailyCounts,
  daysBetween,
  debtAtWeekEnds,
  isoDay,
  orderAge,
  weekStart,
  weeklySales,
} from "./periods";

// Wednesday 7 October 2026, mid-afternoon, local time.
const NOW = new Date(2026, 9, 7, 15, 30);
const day = (d: number, h = 12) => new Date(2026, 9, d, h);

describe("isoDay and weekStart", () => {
  it("names a day in local time", () => {
    expect(isoDay(new Date(2026, 0, 5, 0, 10))).toBe("2026-01-05");
  });

  it("starts a week on Monday", () => {
    expect(isoDay(weekStart(NOW))).toBe("2026-10-05");
    expect(isoDay(weekStart(day(5, 0)))).toBe("2026-10-05");
    // A Sunday belongs to the week that started six days before.
    expect(isoDay(weekStart(day(11)))).toBe("2026-10-05");
  });
});

describe("orderAge", () => {
  it("is fresh up to 14 days, aging to 30, old after", () => {
    expect(daysBetween(day(7, 1), NOW)).toBe(0);
    expect(orderAge(day(7), NOW)).toBe("fresh");
    expect(orderAge(new Date(2026, 8, 23), NOW)).toBe("fresh"); // 14 days
    expect(orderAge(new Date(2026, 8, 22), NOW)).toBe("aging"); // 15
    expect(orderAge(new Date(2026, 8, 7), NOW)).toBe("aging"); // 30
    expect(orderAge(new Date(2026, 8, 6), NOW)).toBe("old"); // 31
  });
});

describe("dailyCounts", () => {
  it("counts the last days, oldest first, today last", () => {
    const counts = dailyCounts([day(7, 9), day(7, 1), day(5), day(1)], 7, NOW);
    expect(counts).toEqual([1, 0, 0, 0, 1, 0, 2]);
  });

  it("ignores dates outside the window", () => {
    expect(dailyCounts([new Date(2026, 8, 1), day(8)], 7, NOW)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});

describe("weeklySales", () => {
  it("buckets ordered by creation and collected by payment, every week present", () => {
    const points = weeklySales({
      orders: [
        { createdAt: day(6), totalAgorot: 1000 },
        { createdAt: day(1), totalAgorot: 500 }, // the week of 28 Sep
        { createdAt: new Date(2026, 7, 1), totalAgorot: 9999 }, // too old
      ],
      payments: [
        { paidAt: day(7), amountAgorot: 300 },
        { paidAt: new Date(2026, 8, 15), amountAgorot: 200 },
      ],
      weeks: 4,
      now: NOW,
    });
    expect(points).toEqual([
      { start: "2026-09-14", ordered: 0, collected: 200 },
      { start: "2026-09-21", ordered: 0, collected: 0 },
      { start: "2026-09-28", ordered: 500, collected: 0 },
      { start: "2026-10-05", ordered: 1000, collected: 300 },
    ]);
  });
});

describe("debtAtWeekEnds", () => {
  it("is each Order's balance as it stood when the week ended, never below zero", () => {
    const points = debtAtWeekEnds({
      orders: [
        { id: "a", createdAt: new Date(2026, 8, 22), totalAgorot: 1000 },
        { id: "b", createdAt: day(6), totalAgorot: 400 },
        { id: "c", createdAt: new Date(2026, 8, 23), totalAgorot: 100 },
      ],
      payments: [
        { orderId: "a", paidAt: new Date(2026, 8, 30), amountAgorot: 600 },
        // Overpaid: counts as nothing owed, not as credit.
        { orderId: "c", paidAt: new Date(2026, 8, 24), amountAgorot: 300 },
        // Paid after "now": not counted yet.
        { orderId: "b", paidAt: day(8), amountAgorot: 400 },
      ],
      weeks: 3,
      now: NOW,
    });
    expect(points).toEqual([
      { start: "2026-09-21", debt: 1000 },
      { start: "2026-09-28", debt: 400 },
      { start: "2026-10-05", debt: 800 },
    ]);
  });
});
