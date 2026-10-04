import { describe, expect, it } from "vitest";

import { matchSuggestions, MAX_SUGGESTIONS, recentDistinct } from "./suggestions";

describe("recentDistinct", () => {
  it("keeps the newest first and drops repeats", () => {
    expect(recentDistinct(["EVA", "גומי", "EVA", "PU"])).toEqual(["EVA", "גומי", "PU"]);
  });

  it("treats case and extra spaces as the same value, keeping the first spelling", () => {
    expect(recentDistinct(["Rubber", " rubber ", "RUBBER  sole", "rubber sole"])).toEqual([
      "Rubber",
      "RUBBER sole",
    ]);
  });

  it("skips null and blank values", () => {
    expect(recentDistinct([null, undefined, "", "   ", "עור"])).toEqual(["עור"]);
  });

  it("stops at the limit", () => {
    const many = Array.from({ length: 50 }, (_, i) => `v${i}`);
    expect(recentDistinct(many)).toHaveLength(MAX_SUGGESTIONS);
    expect(recentDistinct(many, 3)).toEqual(["v0", "v1", "v2"]);
  });
});

describe("matchSuggestions", () => {
  const options = ["גומי", "גומי טבעי", "EVA", "PU"];

  it("offers everything when nothing is typed", () => {
    expect(matchSuggestions(options, "  ").map((m) => m.value)).toEqual(options);
    expect(matchSuggestions(options, "")[0]).toEqual({ value: "גומי", start: -1, length: 0 });
  });

  it("matches anywhere in the value, ignoring case, with where it starts", () => {
    expect(matchSuggestions(options, "טב")).toEqual([
      { value: "גומי טבעי", start: 5, length: 2 },
    ]);
    expect(matchSuggestions(options, "ev")).toEqual([{ value: "EVA", start: 0, length: 2 }]);
  });

  it("leaves out an exact match, whatever its case", () => {
    expect(matchSuggestions(options, "eva")).toEqual([]);
    expect(matchSuggestions(options, "גומי").map((m) => m.value)).toEqual(["גומי טבעי"]);
  });
});
