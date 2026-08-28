import { describe, expect, it } from "vitest";
import {
  classifyPrice,
  describePriceChange,
  impliedPricePerEgg,
  planPriceChange,
  validateEffectiveFrom,
  type CurrentPrice,
} from "@/lib/domain/pricing";

const TODAY = "2026-08-27";

function price(overrides: Partial<CurrentPrice> = {}): CurrentPrice {
  return {
    id: "price-1",
    eggSizeId: "large",
    pricePerEgg: 7,
    pricePerTray: 210,
    effectiveFrom: "2026-08-01",
    effectiveTo: null,
    ...overrides,
  };
}

describe("validateEffectiveFrom", () => {
  it("accepts today", () => {
    expect(validateEffectiveFrom(TODAY, TODAY).ok).toBe(true);
  });

  it("accepts a future date, so a change can be scheduled", () => {
    expect(validateEffectiveFrom("2026-09-01", TODAY).ok).toBe(true);
  });

  it("refuses a past date", () => {
    const result = validateEffectiveFrom("2026-08-26", TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/today or later/i);
  });

  it("refuses a malformed date rather than guessing", () => {
    expect(validateEffectiveFrom("27-08-2026", TODAY).ok).toBe(false);
  });
});

describe("planPriceChange", () => {
  it("inserts when the size has never been priced", () => {
    const result = planPriceChange(null, TODAY, TODAY);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.plan).toEqual({ action: "insert" });
  });

  it("closes the old row and inserts when the new date is later", () => {
    const result = planPriceChange(price({ effectiveFrom: "2026-08-01" }), TODAY, TODAY);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan).toEqual({
        action: "close-and-insert",
        rowId: "price-1",
        // Upper bound is inclusive, so the old price ends the day before.
        closeOldAt: "2026-08-26",
      });
    }
  });

  it("closes at the day before a scheduled future change", () => {
    const result = planPriceChange(price({ effectiveFrom: "2026-08-01" }), "2026-09-01", TODAY);
    expect(result.ok).toBe(true);
    if (result.ok && result.plan.action === "close-and-insert") {
      expect(result.plan.closeOldAt).toBe("2026-08-31");
    }
  });

  /*
   * The case a naive close-then-insert gets wrong. Correcting a price minutes
   * after setting it is completely normal, and closing the row at
   * "today - 1" would put effective_to before effective_from and trip the
   * egg_prices_range_valid check.
   */
  it("replaces in place when the price already starts on that date", () => {
    const result = planPriceChange(price({ effectiveFrom: TODAY }), TODAY, TODAY);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.plan).toEqual({ action: "replace", rowId: "price-1" });
  });

  it("never emits a close date on or before the row it is closing", () => {
    const result = planPriceChange(price({ effectiveFrom: "2026-08-26" }), TODAY, TODAY);
    if (result.ok && result.plan.action === "close-and-insert") {
      expect(result.plan.closeOldAt >= "2026-08-26").toBe(true);
    }
  });

  it("refuses to start before a price that is already scheduled ahead", () => {
    const scheduled = price({ effectiveFrom: "2026-09-15" });
    const result = planPriceChange(scheduled, TODAY, TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/already/i);
  });

  it("refuses a past effective date before looking at the current row", () => {
    const result = planPriceChange(price(), "2026-01-01", TODAY);
    expect(result.ok).toBe(false);
  });

  it("crosses a month boundary correctly when closing", () => {
    const result = planPriceChange(price({ effectiveFrom: "2026-07-15" }), "2026-08-01", "2026-08-01");
    if (result.ok && result.plan.action === "close-and-insert") {
      expect(result.plan.closeOldAt).toBe("2026-07-31");
    }
  });
});

describe("impliedPricePerEgg", () => {
  it("divides a tray price by 30", () => {
    expect(impliedPricePerEgg(210)).toBe(7);
  });

  it("catches the classic missing-zero typo", () => {
    // 21 instead of 210 implies 70 centavos an egg, which is obviously wrong.
    expect(impliedPricePerEgg(21)).toBe(0.7);
  });

  it("returns 0 rather than NaN for a blank tray price", () => {
    expect(impliedPricePerEgg(0)).toBe(0);
    expect(impliedPricePerEgg(Number.NaN)).toBe(0);
  });
});

describe("describePriceChange", () => {
  it("reports a rise with its percentage", () => {
    const change = describePriceChange(210, 220);
    expect(change.direction).toBe("up");
    expect(change.percent).toBeCloseTo(4.8, 1);
  });

  it("reports a fall", () => {
    expect(describePriceChange(220, 210).direction).toBe("down");
  });

  it("reports no change when the price is the same", () => {
    const change = describePriceChange(210, 210);
    expect(change.direction).toBe("same");
    expect(change.percent).toBe(0);
  });

  it("handles a first price, where there is nothing to compare against", () => {
    const change = describePriceChange(0, 210);
    expect(change.direction).toBe("up");
    expect(change.percent).toBeNull();
  });
});

describe("classifyPrice", () => {
  const on = (from: string, to: string | null) => ({ effectiveFrom: from, effectiveTo: to });

  it("calls an open-ended price that has started current", () => {
    expect(classifyPrice(on("2026-08-01", null), TODAY)).toBe("current");
  });

  /*
   * The upper bound of the exclusion constraint is INCLUSIVE, so a price whose
   * effective_to is today is still in force today. Treating it as history put
   * the same price in both "Current" and "Previous" on screen.
   */
  it("keeps a price ending today as current, not previous", () => {
    expect(classifyPrice(on("2026-08-01", TODAY), TODAY)).toBe("current");
  });

  it("calls a price that ended yesterday previous", () => {
    expect(classifyPrice(on("2026-08-01", "2026-08-26"), TODAY)).toBe("previous");
  });

  it("calls a price starting tomorrow scheduled", () => {
    expect(classifyPrice(on("2026-08-28", null), TODAY)).toBe("scheduled");
  });

  it("calls a price starting today current", () => {
    expect(classifyPrice(on(TODAY, null), TODAY)).toBe("current");
  });

  it("classifies every row into exactly one bucket", () => {
    const rows = [
      on("2026-07-01", "2026-07-31"),
      on("2026-08-01", TODAY),
      on("2026-08-28", null),
    ];
    expect(rows.map((r) => classifyPrice(r, TODAY))).toEqual([
      "previous",
      "current",
      "scheduled",
    ]);
  });
});
