import { describe, expect, it } from "vitest";
import {
  ADJUSTMENT_REASONS,
  summariseInventory,
  validateAdjustment,
  type InventoryRow,
} from "@/lib/domain/inventory";
import { EGGS_PER_TRAY } from "@/lib/domain/calculations";

/** Terse builder so each test shows only the numbers it cares about. */
function row(code: string, available: number, extra: Partial<InventoryRow> = {}): InventoryRow {
  return {
    eggSizeId: code.toLowerCase(),
    name: code,
    code,
    sortOrder: 0,
    eggsProduced: available,
    eggsSold: 0,
    eggsAdjusted: 0,
    eggsAvailable: available,
    ...extra,
  };
}

describe("validateAdjustment", () => {
  it("rejects zero — there is nothing to record", () => {
    const result = validateAdjustment(100, 0, "Large");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/add or remove/i);
  });

  it("allows adding stock found in a recount", () => {
    expect(validateAdjustment(100, 25, "Large").ok).toBe(true);
  });

  it("allows adding stock even when the balance is negative", () => {
    // Correcting a negative balance upwards is exactly how a farmer fixes it.
    expect(validateAdjustment(-20, 30, "Large").ok).toBe(true);
  });

  it("allows removing less than is available", () => {
    expect(validateAdjustment(100, -40, "Large").ok).toBe(true);
  });

  it("allows removing exactly the whole balance", () => {
    expect(validateAdjustment(100, -100, "Large").ok).toBe(true);
  });

  it("rejects removing one more than is available", () => {
    const result = validateAdjustment(100, -101, "Large");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("100");
      expect(result.message).toContain("Large");
    }
  });

  it("names the size and both numbers so the farmer can see the gap", () => {
    const result = validateAdjustment(185, -200, "Small");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("185");
      expect(result.message).toContain("200");
      expect(result.message).toContain("Small");
    }
  });

  it("refuses removal from an empty balance with readable wording", () => {
    const result = validateAdjustment(0, -5, "Jumbo");
    expect(result.ok).toBe(false);
    // "You only have 0" reads badly; this case gets its own sentence.
    if (!result.ok) {
      expect(result.message).toMatch(/no Jumbo eggs/i);
      expect(result.message).not.toContain("-");
    }
  });

  it("refuses removal from a negative balance without printing the negative", () => {
    const result = validateAdjustment(-20, -5, "Large");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).not.toContain("-20");
  });

  it("rejects fractions — eggs are whole things", () => {
    expect(validateAdjustment(100, 1.5, "Large").ok).toBe(false);
  });
});

describe("summariseInventory — tray maths", () => {
  /*
   * The defect this suite exists to lock down: trays must be counted per size.
   * Farmers grade into same-size trays, so loose eggs of different sizes do not
   * combine into a sellable tray.
   */
  it("counts whole trays and loose eggs per size", () => {
    const summary = summariseInventory([row("Large", 526)]);
    expect(summary.lines[0].trays).toBe(17);
    expect(summary.lines[0].looseEggs).toBe(16);
  });

  it("sums trays per size rather than dividing the blended total", () => {
    // 185 + 417 + 526 + 93 + 22 = 1243 eggs.
    // Per size: 6 + 13 + 17 + 3 + 0 = 39 trays.
    // Blended:  floor(1243 / 30)   = 41 trays  <- the wrong answer.
    const summary = summariseInventory([
      row("Small", 185),
      row("Medium", 417),
      row("Large", 526),
      row("XL", 93),
      row("Jumbo", 22),
    ]);

    expect(summary.totalEggs).toBe(1243);
    expect(summary.totalTrays).toBe(39);
    expect(summary.totalTrays).not.toBe(Math.floor(1243 / EGGS_PER_TRAY));
  });

  it("agrees with the blended figure only when loose eggs stay under one tray", () => {
    // 310 + 691 + 882 = 1883; loose 10 + 1 + 12 = 23, under 30, so both agree.
    const summary = summariseInventory([row("Small", 310), row("Medium", 691), row("Large", 882)]);
    expect(summary.totalTrays).toBe(Math.floor(1883 / EGGS_PER_TRAY));
    expect(summary.looseEggs).toBe(23);
  });

  it("keeps trays and loose eggs reconciling to the total", () => {
    const summary = summariseInventory([row("Small", 185), row("Large", 526)]);
    expect(summary.totalTrays * EGGS_PER_TRAY + summary.looseEggs).toBe(summary.totalEggs);
  });

  it("reports no trays for an empty farm", () => {
    const summary = summariseInventory([]);
    expect(summary).toMatchObject({ totalEggs: 0, totalTrays: 0, looseEggs: 0, hasNegative: false });
  });
});

describe("summariseInventory — negative stock is surfaced, not hidden", () => {
  it("keeps a negative balance visible instead of clamping it to zero", () => {
    const summary = summariseInventory([row("Large", -20)]);
    expect(summary.lines[0].eggsAvailable).toBe(-20);
    expect(summary.hasNegative).toBe(true);
  });

  it("reports no sellable trays for a negative balance", () => {
    const summary = summariseInventory([row("Large", -20)]);
    expect(summary.lines[0].trays).toBe(0);
    expect(summary.lines[0].looseEggs).toBe(0);
  });

  it("lets a negative size pull the farm total down honestly", () => {
    const summary = summariseInventory([row("Small", 100), row("Large", -20)]);
    expect(summary.totalEggs).toBe(80);
  });

  it("flags nothing when every size is in the black", () => {
    expect(summariseInventory([row("Small", 100)]).hasNegative).toBe(false);
  });

  it("treats exactly zero as fine, not negative", () => {
    expect(summariseInventory([row("Small", 0)]).hasNegative).toBe(false);
  });
});

describe("summariseInventory — ordering and passthrough", () => {
  it("orders lines by the farm's configured sort order", () => {
    const summary = summariseInventory([
      row("Jumbo", 30, { sortOrder: 5 }),
      row("Small", 60, { sortOrder: 1 }),
      row("Large", 90, { sortOrder: 3 }),
    ]);
    expect(summary.lines.map((l) => l.code)).toEqual(["Small", "Large", "Jumbo"]);
  });

  it("carries produced, sold and adjusted through untouched", () => {
    const summary = summariseInventory([
      row("Large", 500, { eggsProduced: 900, eggsSold: 380, eggsAdjusted: -20 }),
    ]);
    expect(summary.lines[0]).toMatchObject({
      eggsProduced: 900,
      eggsSold: 380,
      eggsAdjusted: -20,
      eggsAvailable: 500,
    });
  });
});

describe("ADJUSTMENT_REASONS", () => {
  it("offers the reasons a farmer actually has", () => {
    const values = ADJUSTMENT_REASONS.map((r) => r.value);
    expect(values).toContain("SPOILAGE");
    expect(values).toContain("OWN_USE");
    expect(values).toContain("RECOUNT");
  });

  it("gives every reason a human label", () => {
    for (const reason of ADJUSTMENT_REASONS) {
      expect(reason.label.length).toBeGreaterThan(0);
    }
  });

  it("keeps values stable and machine-readable for later reporting", () => {
    for (const reason of ADJUSTMENT_REASONS) {
      expect(reason.value).toMatch(/^[A-Z_]+$/);
    }
  });
});
