import { describe, expect, it } from "vitest";
import { buildLayingRateSeries, buildSizeSlices } from "@/lib/data/analytics";
import { resolveReportRange } from "@/lib/domain/reports";

function productionRow(date: string, eggs: number, hens: number) {
  return { production_date: date, eggs_collected: eggs, hens_present: hens };
}

describe("buildLayingRateSeries", () => {
  it("compares a week against the same weekday 7 days back", () => {
    const range = resolveReportRange("week", "2026-09-15"); // Mon 2026-09-14 .. Sun 2026-09-20
    const rows = [
      productionRow("2026-09-14", 80, 100), // this Monday
      productionRow("2026-09-07", 60, 100), // last Monday
    ];

    const series = buildLayingRateSeries(rows, range);

    expect(series[0].day).toBe("Mon");
    expect(series[0].layingRate).toBe(80);
    expect(series[0].previous).toBe(60);
    // No data at all for last Tuesday -> previous reads as 0, not missing.
    expect(series[1].previous).toBe(0);
  });

  it("compares a month against the same day last calendar month", () => {
    const range = resolveReportRange("month", "2026-09-15");
    const rows = [
      productionRow("2026-09-01", 90, 100),
      productionRow("2026-08-01", 70, 100),
    ];

    const series = buildLayingRateSeries(rows, range);

    const first = series.find((point) => point.day === "09-01");
    expect(first?.layingRate).toBe(90);
    expect(first?.previous).toBe(70);
  });

  it("compares a rolling 30-day range against the 30 days right before it", () => {
    const range = resolveReportRange("30", "2026-09-15");
    const rows = [
      productionRow(range.from, 50, 100),
      productionRow("2026-07-18", 40, 100), // exactly 30 days before range.from
    ];

    const series = buildLayingRateSeries(rows, range);

    expect(series[0].layingRate).toBe(50);
    expect(series[0].previous).toBe(40);
  });
});

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
