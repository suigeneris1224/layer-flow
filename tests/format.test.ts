import { describe, expect, it } from "vitest";
import {
  farmToday,
  formatCurrency,
  formatCurrencyShort,
  formatNumber,
  formatPercent,
  formatRelativeDay,
  shiftDate,
} from "@/lib/format";

describe("farmToday", () => {
  /*
   * The whole point of this helper. Vercel runs in UTC; a farmer in Cebu
   * recording at 7am on the 13th is at 23:00 UTC on the 12th. Using the
   * server's date would silently file the morning collection under yesterday.
   */
  it("gives the farm's date, not the server's", () => {
    const earlyMorningManila = new Date("2025-08-12T23:00:00Z");
    expect(farmToday("Asia/Manila", earlyMorningManila)).toBe("2025-08-13");
    expect(farmToday("UTC", earlyMorningManila)).toBe("2025-08-12");
  });

  it("holds the same date late in the Manila evening", () => {
    const lateEvening = new Date("2025-08-13T15:30:00Z");
    expect(farmToday("Asia/Manila", lateEvening)).toBe("2025-08-13");
  });

  it("formats as YYYY-MM-DD so it compares and sorts as a string", () => {
    expect(farmToday("Asia/Manila", new Date("2025-01-05T04:00:00Z"))).toBe("2025-01-05");
  });
});

describe("shiftDate", () => {
  it("moves backwards and forwards", () => {
    expect(shiftDate("2025-08-13", -7)).toBe("2025-08-06");
    expect(shiftDate("2025-08-13", 1)).toBe("2025-08-14");
  });

  it("crosses month and year boundaries", () => {
    expect(shiftDate("2025-03-01", -1)).toBe("2025-02-28");
    expect(shiftDate("2025-01-01", -1)).toBe("2024-12-31");
  });

  it("handles a leap day", () => {
    expect(shiftDate("2024-03-01", -1)).toBe("2024-02-29");
  });
});

describe("formatRelativeDay", () => {
  it("names today and yesterday", () => {
    const today = farmToday("Asia/Manila");
    expect(formatRelativeDay(today)).toBe("Today");
    expect(formatRelativeDay(shiftDate(today, -1))).toBe("Yesterday");
  });

  it("falls back to a short date further back", () => {
    const today = farmToday("Asia/Manila");
    expect(formatRelativeDay(shiftDate(today, -10))).not.toMatch(/Today|Yesterday/);
  });
});

describe("money formatting", () => {
  it("shows PHP with centavos", () => {
    expect(formatCurrency(1850)).toContain("1,850.00");
    expect(formatCurrency(1850)).toMatch(/₱|PHP/);
  });

  it("drops centavos in the short form used on tiles", () => {
    expect(formatCurrencyShort(5900)).toContain("5,900");
    expect(formatCurrencyShort(5900)).not.toContain(".00");
  });

  it("shows a loss as negative rather than hiding it", () => {
    expect(formatCurrency(-1050)).toContain("1,050.00");
    expect(formatCurrency(-1050)).toMatch(/-|\(/);
  });

  it("renders 0 rather than NaN for a bad value", () => {
    expect(formatCurrency(Number.NaN)).toContain("0.00");
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe("0");
  });
});

describe("number formatting", () => {
  it("groups thousands", () => {
    expect(formatNumber(1200)).toBe("1,200");
  });

  it("formats a percentage to one decimal", () => {
    expect(formatPercent(87)).toBe("87.0%");
  });
});
