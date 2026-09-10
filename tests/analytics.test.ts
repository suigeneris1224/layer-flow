import { describe, expect, it } from "vitest";
import { buildSizeSlices } from "@/lib/data/analytics";

/**
 * buildSizeSlices consumes one row per (day, egg size) from the underlying
 * query -- a multi-day range means several rows share the same size name,
 * and this must collapse them into one slice per name. Before the fix, it
 * passed every raw row straight through, which is what produced hundreds of
 * near-duplicate slices (and the "very long page") on a wide date range.
 */

function row(name: string, sortOrder: number, quantity: number) {
  return { quantity, egg_sizes: { name, sort_order: sortOrder } };
}

describe("buildSizeSlices", () => {
  it("sums quantities for rows sharing the same size name, across multiple days", () => {
    const rows = [
      row("Medium", 2, 100),
      row("Medium", 2, 120),
      row("Medium", 2, 90),
      row("Large", 3, 50),
    ];

    const slices = buildSizeSlices(rows);

    expect(slices).toHaveLength(2);
    expect(slices.find((s) => s.name === "Medium")?.quantity).toBe(310);
    expect(slices.find((s) => s.name === "Large")?.quantity).toBe(50);
  });

  it("never returns more slices than distinct size names, regardless of row count", () => {
    // Simulates a year-long range: 5 sizes x 365 days = 1825 raw rows.
    const rows = Array.from({ length: 365 }, (_, day) => [
      row("Small", 1, 10 + day),
      row("Medium", 2, 20 + day),
      row("Large", 3, 5),
      row("Extra Large", 4, 2),
      row("Jumbo", 5, 1),
    ]).flat();

    const slices = buildSizeSlices(rows);

    expect(slices).toHaveLength(5);
  });

  it("computes percentages that sum to ~100", () => {
    const rows = [row("Small", 1, 30), row("Medium", 2, 50), row("Large", 3, 20)];

    const slices = buildSizeSlices(rows);
    const totalPercentage = slices.reduce((sum, s) => sum + s.percentage, 0);

    expect(totalPercentage).toBeCloseTo(100, 0);
  });

  it("filters out a size with zero total quantity", () => {
    const rows = [row("Small", 1, 0), row("Medium", 2, 40)];

    const slices = buildSizeSlices(rows);

    expect(slices).toHaveLength(1);
    expect(slices[0].name).toBe("Medium");
  });

  it("orders slices by sort_order, not by first appearance", () => {
    const rows = [row("Large", 3, 10), row("Small", 1, 10), row("Medium", 2, 10)];

    const slices = buildSizeSlices(rows);

    expect(slices.map((s) => s.name)).toEqual(["Small", "Medium", "Large"]);
  });

  it("labels a row with no matching egg size as 'Unknown'", () => {
    const rows = [{ quantity: 15, egg_sizes: null }];

    const slices = buildSizeSlices(rows);

    expect(slices).toEqual([{ name: "Unknown", quantity: 15, percentage: 100 }]);
  });

  it("returns an empty array for no rows", () => {
    expect(buildSizeSlices([])).toEqual([]);
  });
});
