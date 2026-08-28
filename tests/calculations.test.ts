import { describe, expect, it } from "vitest";
import {
  EGGS_PER_TRAY,
  checkInventoryAvailability,
  costPerEgg,
  costPerTray,
  eggSizeDistribution,
  eggsToTrays,
  feedCost,
  feedCostPerEgg,
  feedPerHen,
  flockAgeWeeks,
  layingRate,
  operatingProfit,
  percentChange,
  profitPerEgg,
  roundMoney,
  saleItemEggCount,
  saleItemSubtotal,
  saleTotal,
  sellableEggs,
  validateEggSizeBreakdown,
} from "@/lib/domain/calculations";

describe("layingRate", () => {
  it("computes eggs per hen as a percentage", () => {
    expect(layingRate(820, 942)).toBe(87);
  });

  it("returns 0 for an empty house instead of dividing by zero", () => {
    expect(layingRate(0, 0)).toBe(0);
    expect(layingRate(100, 0)).toBe(0);
  });

  it("allows rates above 100 rather than clamping", () => {
    // Double-yolkers and miscounts happen; hiding them hides a data problem.
    expect(layingRate(110, 100)).toBe(110);
  });
});

describe("sellableEggs", () => {
  it("subtracts broken and dirty eggs", () => {
    expect(sellableEggs(820, 12, 8)).toBe(800);
  });

  it("never goes negative", () => {
    expect(sellableEggs(10, 20, 20)).toBe(0);
  });
});

describe("tray conversion", () => {
  it("uses 30 eggs per tray", () => {
    expect(EGGS_PER_TRAY).toBe(30);
  });

  it("splits eggs into whole trays and loose eggs", () => {
    expect(eggsToTrays(820)).toEqual({ trays: 27, looseEggs: 10 });
    expect(eggsToTrays(30)).toEqual({ trays: 1, looseEggs: 0 });
    expect(eggsToTrays(0)).toEqual({ trays: 0, looseEggs: 0 });
  });
});

describe("feed", () => {
  it("multiplies quantity by unit cost", () => {
    expect(feedCost(115, 28.5)).toBe(3277.5);
  });

  it("computes feed per hen in kg", () => {
    expect(feedPerHen(115, 942)).toBeCloseTo(0.1221, 4);
  });

  it("returns 0 feed per hen when there are no hens", () => {
    expect(feedPerHen(115, 0)).toBe(0);
  });

  it("computes feed cost per egg", () => {
    expect(feedCostPerEgg(3277.5, 820)).toBeCloseTo(3.9970, 4);
  });

  it("returns 0 cost per egg on a zero-collection day", () => {
    expect(feedCostPerEgg(3277.5, 0)).toBe(0);
  });
});

describe("egg size breakdown", () => {
  const breakdown = [
    { eggSizeId: "s", quantity: 120 },
    { eggSizeId: "m", quantity: 280 },
    { eggSizeId: "l", quantity: 350 },
    { eggSizeId: "xl", quantity: 60 },
    { eggSizeId: "j", quantity: 10 },
  ];

  it("accepts a breakdown that matches the collection exactly", () => {
    const result = validateEggSizeBreakdown(820, breakdown);
    expect(result.ok).toBe(true);
    expect(result.total).toBe(820);
    expect(result.unassigned).toBe(0);
  });

  it("allows a partial breakdown while grading is still in progress", () => {
    const result = validateEggSizeBreakdown(820, [{ eggSizeId: "l", quantity: 350 }]);
    expect(result.ok).toBe(true);
    expect(result.unassigned).toBe(470);
  });

  it("rejects a breakdown that exceeds eggs collected", () => {
    const result = validateEggSizeBreakdown(800, breakdown);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("820");
      expect(result.message).toContain("800");
    }
  });

  it("computes each size's share of the day", () => {
    const shares = eggSizeDistribution(breakdown);
    expect(shares.find((s) => s.eggSizeId === "l")?.percentage).toBe(42.7);
    expect(shares.find((s) => s.eggSizeId === "j")?.percentage).toBe(1.2);
  });

  it("reports 0% for every size when nothing was collected", () => {
    const shares = eggSizeDistribution([{ eggSizeId: "l", quantity: 0 }]);
    expect(shares[0].percentage).toBe(0);
  });
});

describe("sales", () => {
  const items = [
    { quantityTrays: 10, quantityEggs: 0, pricePerTray: 210, pricePerEgg: 7 },
    { quantityTrays: 5, quantityEggs: 0, pricePerTray: 180, pricePerEgg: 6 },
    { quantityTrays: 2, quantityEggs: 0, pricePerTray: 165, pricePerEgg: 5.5 },
  ];

  it("prices a tray line", () => {
    expect(saleItemSubtotal(items[0])).toBe(2100);
  });

  it("prices trays and loose eggs independently in one line", () => {
    const subtotal = saleItemSubtotal({
      quantityTrays: 10,
      quantityEggs: 7,
      pricePerTray: 210,
      pricePerEgg: 7,
    });
    expect(subtotal).toBe(2149);
  });

  it("totals a multi-size sale", () => {
    expect(saleTotal(items)).toBe(3330);
  });

  it("counts eggs leaving inventory including trays", () => {
    expect(saleItemEggCount({ quantityTrays: 10, quantityEggs: 7 })).toBe(307);
  });

  it("keeps repeated money arithmetic free of float drift", () => {
    const drifty = Array.from({ length: 3 }, () => ({
      quantityTrays: 0,
      quantityEggs: 1,
      pricePerTray: 0,
      pricePerEgg: 0.1,
    }));
    expect(saleTotal(drifty)).toBe(0.3);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });
});

describe("profitability", () => {
  it("computes estimated operating profit", () => {
    expect(operatingProfit(5900, 4050)).toBe(1850);
  });

  it("reports a loss as a negative number", () => {
    expect(operatingProfit(3000, 4050)).toBe(-1050);
  });

  it("computes cost per egg and per tray", () => {
    expect(costPerEgg(4050, 820)).toBeCloseTo(4.939, 3);
    expect(costPerTray(4050, 820)).toBeCloseTo(148.17, 2);
  });

  it("computes profit per egg", () => {
    expect(profitPerEgg(5900, 4050, 820)).toBeCloseTo(2.2561, 4);
  });

  it("guards divide-by-zero on a day with no production", () => {
    expect(costPerEgg(4050, 0)).toBe(0);
    expect(costPerTray(4050, 0)).toBe(0);
    expect(profitPerEgg(5900, 4050, 0)).toBe(0);
  });

  it("computes period-over-period change", () => {
    expect(percentChange(110, 100)).toBe(10);
    expect(percentChange(90, 100)).toBe(-10);
  });

  it("returns null rather than Infinity when the base period is zero", () => {
    expect(percentChange(100, 0)).toBeNull();
  });
});

describe("inventory availability", () => {
  const names = new Map([
    ["l", "Large"],
    ["m", "Medium"],
  ]);
  const stock = [
    { eggSizeId: "l", eggsAvailable: 300 },
    { eggSizeId: "m", eggsAvailable: 150 },
  ];

  it("allows a sale within stock", () => {
    const req = new Map([["l", 300]]);
    expect(checkInventoryAvailability(req, stock, names).ok).toBe(true);
  });

  it("blocks a sale that would drive inventory negative", () => {
    const req = new Map([["l", 301]]);
    const result = checkInventoryAvailability(req, stock, names);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Not enough Large eggs");
    }
  });

  it("treats a size with no recorded stock as zero", () => {
    const req = new Map([["xl", 1]]);
    expect(checkInventoryAvailability(req, stock, names).ok).toBe(false);
  });
});

describe("flockAgeWeeks", () => {
  it("reports age in whole weeks since placement", () => {
    const placed = "2025-01-01";
    const asOf = new Date("2025-08-13T00:00:00Z");
    expect(flockAgeWeeks(placed, asOf)).toBe(32);
  });

  it("returns 0 for a flock placed today", () => {
    const today = new Date("2025-08-13T00:00:00Z");
    expect(flockAgeWeeks("2025-08-13", today)).toBe(0);
  });

  it("never reports a negative age for a future placement", () => {
    const today = new Date("2025-08-13T00:00:00Z");
    expect(flockAgeWeeks("2025-12-01", today)).toBe(0);
  });
});
