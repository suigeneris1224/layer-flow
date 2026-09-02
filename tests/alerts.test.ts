import { describe, expect, it } from "vitest";
import {
  THRESHOLDS,
  compareRecentToBaseline,
  eggSizeAlert,
  feedCostAlert,
  flockLossAlert,
  lowInventoryAlert,
  mortalityAlert,
  productionAlert,
  resolveThresholds,
  stalePricingAlert,
  summariseAlerts,
  underperformingFlockAlert,
  vaccinationAlert,
  type AlertThresholdOverrides,
  type ProductionPoint,
} from "@/lib/domain/alerts";

/** Build `days` of production, oldest first, at a steady rate. */
function steady(days: number, eggs: number, startDay = 1): ProductionPoint[] {
  return Array.from({ length: days }, (_, index) => ({
    date: `2025-08-${String(startDay + index).padStart(2, "0")}`,
    eggs,
  }));
}

describe("compareRecentToBaseline", () => {
  it("returns null without enough history to be honest", () => {
    expect(compareRecentToBaseline(steady(5, 800))).toBeNull();
  });

  it("reports no change on a flat run", () => {
    const result = compareRecentToBaseline(steady(10, 800));
    expect(result?.change).toBe(0);
  });

  it("compares the last 3 days against the previous 7", () => {
    const points = [...steady(7, 800, 1), ...steady(3, 720, 8)];
    const result = compareRecentToBaseline(points);
    expect(result?.baseline).toBe(800);
    expect(result?.recent).toBe(720);
    expect(result?.change).toBeCloseTo(-0.1, 5);
  });

  it("returns null when the baseline is zero, rather than dividing by it", () => {
    const points = [...steady(7, 0, 1), ...steady(3, 500, 8)];
    expect(compareRecentToBaseline(points)).toBeNull();
  });

  it("sorts unordered input before comparing", () => {
    const points = [...steady(3, 720, 8), ...steady(7, 800, 1)];
    expect(compareRecentToBaseline(points)?.recent).toBe(720);
  });
});

describe("productionAlert", () => {
  it("stays quiet on a steady flock", () => {
    expect(productionAlert(steady(10, 800))).toBeNull();
  });

  it("stays quiet for a drop at exactly the threshold", () => {
    const points = [...steady(7, 800, 1), ...steady(3, 720, 8)];
    expect(productionAlert(points)).toBeNull();
  });

  it("warns once a drop clears the threshold", () => {
    const points = [...steady(7, 800, 1), ...steady(3, 700, 8)];
    const alert = productionAlert(points);
    expect(alert?.level).toBe("warn");
    expect(alert?.message).toContain("down 13%");
  });

  it("escalates a severe drop", () => {
    const points = [...steady(7, 800, 1), ...steady(3, 400, 8)];
    expect(productionAlert(points)?.level).toBe("bad");
  });

  it("says nothing about a rise", () => {
    const points = [...steady(7, 700, 1), ...steady(3, 900, 8)];
    expect(productionAlert(points)).toBeNull();
  });

  it("says nothing for a brand new farm", () => {
    expect(productionAlert([])).toBeNull();
  });
});

describe("feedCostAlert", () => {
  it("ignores a normal day", () => {
    expect(feedCostAlert(1000, 1000)).toBeNull();
  });

  it("warns when feed cost rises past the threshold", () => {
    const alert = feedCostAlert(1200, 1000);
    expect(alert?.level).toBe("warn");
    expect(alert?.message).toContain("20%");
  });

  it("stays quiet with no baseline to compare against", () => {
    expect(feedCostAlert(1200, 0)).toBeNull();
  });
});

describe("mortalityAlert", () => {
  it("stays quiet on a day with no deaths", () => {
    expect(mortalityAlert(0, 1000)).toBeNull();
  });

  it("accepts background mortality without comment", () => {
    expect(mortalityAlert(4, 1000)).toBeNull();
  });

  it("speaks up above the normal range", () => {
    expect(mortalityAlert(9, 1000)?.level).toBe("warn");
  });

  it("escalates a severe day", () => {
    expect(mortalityAlert(30, 1000)?.level).toBe("bad");
  });

  it("does not divide by zero on an empty house", () => {
    expect(mortalityAlert(5, 0)).toBeNull();
  });

  it("never offers a diagnosis", () => {
    const message = mortalityAlert(30, 1000)?.message ?? "";
    for (const word of ["disease", "infection", "virus", "treat", "medicine"]) {
      expect(message.toLowerCase()).not.toContain(word);
    }
  });
});

describe("eggSizeAlert", () => {
  it("ignores normal drift", () => {
    expect(eggSizeAlert("Large", 43, 45)).toBeNull();
  });

  it("flags a size that fell sharply", () => {
    const alert = eggSizeAlert("Large", 30, 45);
    expect(alert?.message).toContain("Large egg production is lower");
  });

  it("flags a size that rose sharply", () => {
    const alert = eggSizeAlert("Small", 30, 15);
    expect(alert?.message).toContain("bigger share");
  });
});

describe("summariseAlerts", () => {
  it("says production is normal when nothing fired", () => {
    const summary = summariseAlerts([null, null]);
    expect(summary).toHaveLength(1);
    expect(summary[0]).toEqual({ level: "good", message: "Production is normal." });
  });

  it("puts the most serious alert first", () => {
    const summary = summariseAlerts([
      { level: "warn", message: "warn" },
      { level: "bad", message: "bad" },
    ]);
    expect(summary[0].level).toBe("bad");
  });

  it("drops the nulls", () => {
    const summary = summariseAlerts([null, { level: "warn", message: "warn" }, null]);
    expect(summary).toHaveLength(1);
  });
});

describe("vaccinationAlert", () => {
  const ASOF = new Date("2026-08-31T00:00:00Z");

  it("stays quiet for a flock younger than the threshold", () => {
    const alert = vaccinationAlert(
      {
        flockName: "House 1 layers",
        lastVaccinationDate: null,
        placementDate: "2026-08-01",
      },
      ASOF
    );
    expect(alert).toBeNull();
  });

  it("flags an established flock with nothing on record", () => {
    const alert = vaccinationAlert(
      {
        flockName: "House 1 layers",
        lastVaccinationDate: null,
        placementDate: "2025-01-01",
      },
      ASOF
    );
    expect(alert?.level).toBe("warn");
    expect(alert?.message).toContain("no vaccination recorded");
  });

  it("stays quiet when a vaccination is recent enough", () => {
    const alert = vaccinationAlert(
      {
        flockName: "House 1 layers",
        lastVaccinationDate: "2026-08-01",
        placementDate: "2025-01-01",
      },
      ASOF
    );
    expect(alert).toBeNull();
  });

  it("flags a long gap and says how long", () => {
    const alert = vaccinationAlert(
      {
        flockName: "House 1 layers",
        lastVaccinationDate: "2026-01-01",
        placementDate: "2025-01-01",
      },
      ASOF
    );
    expect(alert?.level).toBe("warn");
    expect(alert?.message).toContain("242 days");
  });

  it("names no vaccine and prescribes no schedule", () => {
    const alert = vaccinationAlert(
      {
        flockName: "House 1 layers",
        lastVaccinationDate: null,
        placementDate: "2025-01-01",
      },
      ASOF
    );
    expect(alert?.message).not.toMatch(/should|must|recommend|vaccinate now/i);
  });

  it("handles a malformed stored date without throwing", () => {
    expect(() =>
      vaccinationAlert(
        {
          flockName: "House 1 layers",
          lastVaccinationDate: "not-a-date",
          placementDate: "2025-01-01",
        },
        ASOF
      )
    ).not.toThrow();
  });

  it("respects a custom gap threshold", () => {
    // 60 days ago is well past a 30-day threshold, but nowhere near the 120-day default.
    const alert = vaccinationAlert(
      {
        flockName: "House 1 layers",
        lastVaccinationDate: "2026-07-02",
        placementDate: "2025-01-01",
      },
      ASOF,
      30
    );
    expect(alert?.level).toBe("warn");
  });
});

describe("parameterized thresholds", () => {
  it("productionAlert keeps default behavior when no threshold is passed", () => {
    const points = [...steady(7, 800, 1), ...steady(3, 700, 8)];
    expect(productionAlert(points)?.level).toBe("warn");
  });

  it("productionAlert respects a tighter custom threshold", () => {
    // A 5% drop clears a 4% threshold (but stays under double it, so "warn") --
    // the 10% default would stay silent.
    const points = [...steady(7, 800, 1), ...steady(3, 760, 8)];
    expect(productionAlert(points)).toBeNull();
    expect(productionAlert(points, 0.04)?.level).toBe("warn");
  });

  it("feedCostAlert respects a custom threshold", () => {
    expect(feedCostAlert(1050, 1000)).toBeNull();
    expect(feedCostAlert(1050, 1000, 0.02)?.level).toBe("warn");
  });

  it("mortalityAlert respects a custom threshold", () => {
    expect(mortalityAlert(4, 1000)).toBeNull();
    // 4/1000 = 0.4% clears a 0.2% threshold but stays under 3x it, so "warn".
    expect(mortalityAlert(4, 1000, 0.002)?.level).toBe("warn");
  });

  it("eggSizeAlert respects a custom threshold", () => {
    expect(eggSizeAlert("Large", 40, 45)).toBeNull();
    expect(eggSizeAlert("Large", 40, 45, 3)?.message).toContain("lower");
  });
});

describe("lowInventoryAlert", () => {
  it("stays quiet on healthy stock", () => {
    expect(lowInventoryAlert(20)).toBeNull();
  });

  it("warns at or below the threshold", () => {
    expect(lowInventoryAlert(THRESHOLDS.lowInventoryTrays)?.level).toBe("warn");
  });

  it("escalates when the shed is empty", () => {
    expect(lowInventoryAlert(0)?.level).toBe("bad");
  });

  it("respects a custom threshold", () => {
    expect(lowInventoryAlert(10)).toBeNull();
    expect(lowInventoryAlert(10, 15)?.level).toBe("warn");
  });
});

describe("underperformingFlockAlert", () => {
  it("stays quiet on a flock near the farm average", () => {
    expect(underperformingFlockAlert({ name: "House 1", layingRate: 88 }, 90)).toBeNull();
  });

  it("flags a flock well below the farm average", () => {
    const alert = underperformingFlockAlert({ name: "House 1", layingRate: 50 }, 90);
    expect(alert?.level).toBe("warn");
    expect(alert?.message).toContain("House 1");
  });

  it("stays quiet with no farm average to compare against", () => {
    expect(underperformingFlockAlert({ name: "House 1", layingRate: 50 }, 0)).toBeNull();
  });

  it("respects a custom threshold", () => {
    // 15% below average clears a 10% threshold but not the 20% default.
    expect(underperformingFlockAlert({ name: "House 1", layingRate: 85 }, 100)).toBeNull();
    expect(
      underperformingFlockAlert({ name: "House 1", layingRate: 85 }, 100, 10)?.level
    ).toBe("warn");
  });
});

describe("flockLossAlert", () => {
  it("stays quiet on a profitable flock", () => {
    expect(flockLossAlert({ name: "House 1", profit: 500 })).toBeNull();
  });

  it("stays quiet exactly at break-even", () => {
    expect(flockLossAlert({ name: "House 1", profit: 0 })).toBeNull();
  });

  it("flags any loss with the default threshold", () => {
    const alert = flockLossAlert({ name: "House 1", profit: -1 });
    expect(alert?.level).toBe("warn");
    expect(alert?.message).toContain("loss");
  });

  it("respects a custom threshold", () => {
    expect(flockLossAlert({ name: "House 1", profit: -300 }, 500)).toBeNull();
    expect(flockLossAlert({ name: "House 1", profit: -600 }, 500)?.level).toBe("warn");
  });
});

describe("stalePricingAlert", () => {
  const ASOF = new Date("2026-08-31T00:00:00Z");

  it("flags a size that has never been priced", () => {
    const alert = stalePricingAlert({ name: "Large", effectiveFrom: null }, ASOF);
    expect(alert?.message).toContain("never been priced");
  });

  it("stays quiet on a recently priced size", () => {
    expect(stalePricingAlert({ name: "Large", effectiveFrom: "2026-08-01" }, ASOF)).toBeNull();
  });

  it("flags a size priced long ago", () => {
    const alert = stalePricingAlert({ name: "Large", effectiveFrom: "2026-01-01" }, ASOF);
    expect(alert?.level).toBe("warn");
    expect(alert?.message).toContain("days");
  });

  it("respects a custom threshold", () => {
    expect(stalePricingAlert({ name: "Large", effectiveFrom: "2026-08-01" }, ASOF, 10)?.level).toBe(
      "warn"
    );
  });
});

describe("resolveThresholds", () => {
  const overrides: AlertThresholdOverrides = {
    productionDrop: 0.2,
    feedCostRise: null,
    dailyMortalityRate: null,
    eggSizeShift: 5,
    vaccinationGapDays: null,
    lowInventoryTrays: null,
    stalePricingDays: null,
    underperformancePct: null,
    lossThresholdPesos: null,
  };

  it("returns pure defaults when not entitled, even with overrides on file", () => {
    const resolved = resolveThresholds(overrides, false);
    expect(resolved).toEqual(THRESHOLDS);
  });

  it("returns pure defaults with no overrides on file", () => {
    expect(resolveThresholds(null, true)).toEqual(THRESHOLDS);
  });

  it("merges set fields and falls back on null ones", () => {
    const resolved = resolveThresholds(overrides, true);
    expect(resolved.productionDrop).toBe(0.2);
    expect(resolved.eggSizeShift).toBe(5);
    expect(resolved.feedCostRise).toBe(THRESHOLDS.feedCostRise);
    expect(resolved.lowInventoryTrays).toBe(THRESHOLDS.lowInventoryTrays);
  });
});
