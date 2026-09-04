import { describe, expect, it } from "vitest";
import { daysBetween, sameRangeLastYear, samePeriodLastMonth } from "@/lib/domain/reports";

/**
 * The year-over-year comparison window.
 *
 * The rule worth guarding: the window must land on the *same dates* a year
 * earlier, not 365 days earlier. Subtracting a fixed 365 slides the window by
 * a day across a leap year, so "August 2026" would quietly be compared against
 * 31 July - 30 August 2025.
 */

describe("sameRangeLastYear", () => {
  it("keeps the same dates a year earlier", () => {
    expect(sameRangeLastYear("2026-08-01", "2026-08-31")).toEqual({
      from: "2025-08-01",
      to: "2025-08-31",
    });
  });

  it("does not slide across a leap year the way -365 days would", () => {
    // 2024 is a leap year, so 2025-03-10 minus 365 days is 2024-03-11.
    const result = sameRangeLastYear("2025-03-10", "2025-03-20");
    expect(result).toEqual({ from: "2024-03-10", to: "2024-03-20" });
  });

  it("clamps 29 February to the 28th in a common year", () => {
    expect(sameRangeLastYear("2024-02-29", "2024-02-29")).toEqual({
      from: "2023-02-28",
      to: "2023-02-28",
    });
  });

  it("keeps 29 February when the previous year is also a leap year", () => {
    // 2024 -> 2023 is the clamping case; 2025 -> 2024 keeps the 29th available.
    expect(sameRangeLastYear("2025-02-28", "2025-02-28")).toEqual({
      from: "2024-02-28",
      to: "2024-02-28",
    });
  });

  it("handles a full calendar year", () => {
    expect(sameRangeLastYear("2026-01-01", "2026-12-31")).toEqual({
      from: "2025-01-01",
      to: "2025-12-31",
    });
  });

  it("preserves the length of a window that does not span a leap day", () => {
    const from = "2026-06-01";
    const to = "2026-06-30";
    const previous = sameRangeLastYear(from, to);
    expect(daysBetween(previous.from, previous.to)).toBe(daysBetween(from, to));
  });

  it("pads single-digit months and days", () => {
    expect(sameRangeLastYear("2026-01-05", "2026-09-09")).toEqual({
      from: "2025-01-05",
      to: "2025-09-09",
    });
  });
});

describe("samePeriodLastMonth", () => {
  it("shifts back one calendar month, keeping the day", () => {
    expect(samePeriodLastMonth("2026-09-01", "2026-09-04")).toEqual({
      from: "2026-08-01",
      to: "2026-08-04",
    });
  });

  it("rolls back across a year boundary", () => {
    expect(samePeriodLastMonth("2026-01-01", "2026-01-10")).toEqual({
      from: "2025-12-01",
      to: "2025-12-10",
    });
  });

  it("clamps a day that doesn't exist in the shorter previous month", () => {
    // March 31 has no equivalent in February.
    expect(samePeriodLastMonth("2026-03-31", "2026-03-31")).toEqual({
      from: "2026-02-28",
      to: "2026-02-28",
    });
  });

  it("clamps to the 29th when the previous month is a leap February", () => {
    expect(samePeriodLastMonth("2024-03-31", "2024-03-31")).toEqual({
      from: "2024-02-29",
      to: "2024-02-29",
    });
  });
});
