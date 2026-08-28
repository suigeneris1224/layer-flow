import { describe, expect, it } from "vitest";
import {
  checkSaleAgainstStock,
  derivePaymentStatus,
  outstandingBalance,
  summariseSale,
  type SaleLine,
} from "@/lib/domain/sales";
import { EGGS_PER_TRAY } from "@/lib/domain/calculations";

/** Terse builder so each test shows only the numbers it cares about. */
function line(eggSizeId: string, partial: Partial<SaleLine> = {}): SaleLine {
  return {
    eggSizeId,
    quantityTrays: 0,
    quantityEggs: 0,
    pricePerTray: 210,
    pricePerEgg: 7,
    ...partial,
  };
}

describe("derivePaymentStatus", () => {
  it("calls nothing paid UNPAID", () => {
    expect(derivePaymentStatus(2100, 0)).toBe("UNPAID");
  });

  it("calls the exact total PAID", () => {
    expect(derivePaymentStatus(2100, 2100)).toBe("PAID");
  });

  it("calls an overpayment PAID rather than inventing a credit", () => {
    // A farmer rounding up "keep the change" must not leave the sale looking
    // half-settled.
    expect(derivePaymentStatus(2100, 2500)).toBe("PAID");
  });

  it("calls anything in between PARTIAL", () => {
    expect(derivePaymentStatus(2100, 1)).toBe("PARTIAL");
    expect(derivePaymentStatus(2100, 1050)).toBe("PARTIAL");
    expect(derivePaymentStatus(2100, 2099.99)).toBe("PARTIAL");
  });

  it("treats a zero-total sale as PAID, because nothing is owed", () => {
    // Both UNPAID and PAID satisfy the database check here; PAID is the honest
    // one -- an unpriced giveaway is not money someone owes you.
    expect(derivePaymentStatus(0, 0)).toBe("PAID");
  });

  it("never reports a negative amount as part payment", () => {
    expect(derivePaymentStatus(2100, -50)).toBe("UNPAID");
  });

  it("rounds to centavos before deciding", () => {
    // 0.1 + 0.2 arithmetic upstream must not turn a settled sale into PARTIAL.
    expect(derivePaymentStatus(0.1 + 0.2, 0.3)).toBe("PAID");
  });
});

describe("outstandingBalance", () => {
  it("is what is still owed", () => {
    expect(outstandingBalance(2100, 500)).toBe(1600);
  });

  it("is zero when settled", () => {
    expect(outstandingBalance(2100, 2100)).toBe(0);
  });

  it("never goes negative on an overpayment", () => {
    expect(outstandingBalance(2100, 2500)).toBe(0);
  });

  it("is the whole total when nothing has been paid", () => {
    expect(outstandingBalance(2100, 0)).toBe(2100);
  });
});

describe("summariseSale", () => {
  it("totals trays and loose eggs across lines", () => {
    const summary = summariseSale([
      line("large", { quantityTrays: 10 }),
      line("medium", { quantityTrays: 2, quantityEggs: 5, pricePerTray: 180, pricePerEgg: 6 }),
    ]);

    expect(summary.total).toBe(10 * 210 + 2 * 180 + 5 * 6);
  });

  it("counts the eggs leaving stock per size", () => {
    const summary = summariseSale([line("large", { quantityTrays: 10, quantityEggs: 7 })]);

    expect(summary.eggsBySize.get("large")).toBe(10 * EGGS_PER_TRAY + 7);
    expect(summary.totalEggs).toBe(307);
  });

  it("merges two lines of the same size", () => {
    // Nothing stops a farmer adding Large twice; stock must be checked against
    // the combined figure, not each line alone.
    const summary = summariseSale([
      line("large", { quantityTrays: 10 }),
      line("large", { quantityTrays: 5 }),
    ]);

    expect(summary.eggsBySize.size).toBe(1);
    expect(summary.eggsBySize.get("large")).toBe(15 * EGGS_PER_TRAY);
  });

  it("ignores empty lines the farmer has not filled in", () => {
    const summary = summariseSale([line("large", { quantityTrays: 10 }), line("medium")]);

    expect(summary.total).toBe(2100);
    expect(summary.eggsBySize.has("medium")).toBe(false);
  });

  it("is zero for an empty sale", () => {
    const summary = summariseSale([]);
    expect(summary.total).toBe(0);
    expect(summary.totalEggs).toBe(0);
  });
});

describe("checkSaleAgainstStock", () => {
  const available = [
    { eggSizeId: "large", eggsAvailable: 526 },
    { eggSizeId: "medium", eggsAvailable: 40 },
  ];
  const names = new Map([
    ["large", "Large"],
    ["medium", "Medium"],
  ]);

  it("says nothing when there is enough stock", () => {
    const warnings = checkSaleAgainstStock([line("large", { quantityTrays: 10 })], available, names);
    expect(warnings).toEqual([]);
  });

  it("warns -- and only warns -- when a size is short", () => {
    // Farms sell before recording the morning collection. Refusing the sale
    // would make the app wrong about reality, so this returns a warning the
    // caller is free to save through.
    const warnings = checkSaleAgainstStock([line("large", { quantityTrays: 20 })], available, names);

    expect(warnings).toHaveLength(1);
    expect(warnings[0].eggSizeId).toBe("large");
    expect(warnings[0].requested).toBe(600);
    expect(warnings[0].available).toBe(526);
    expect(warnings[0].message).toContain("526");
    expect(warnings[0].message).toContain("600");
  });

  it("warns once per short size, not once per line", () => {
    const warnings = checkSaleAgainstStock(
      [
        line("large", { quantityTrays: 15 }),
        line("large", { quantityTrays: 15 }),
        line("medium", { quantityTrays: 3 }),
      ],
      available,
      names
    );

    expect(warnings.map((w) => w.eggSizeId)).toEqual(["large", "medium"]);
  });

  it("treats a size with no balance row as no stock", () => {
    const warnings = checkSaleAgainstStock([line("jumbo", { quantityEggs: 5 })], available, names);

    expect(warnings).toHaveLength(1);
    expect(warnings[0].available).toBe(0);
  });

  it("warns when stock is already negative", () => {
    const warnings = checkSaleAgainstStock(
      [line("large", { quantityEggs: 1 })],
      [{ eggSizeId: "large", eggsAvailable: -20 }],
      names
    );

    expect(warnings).toHaveLength(1);
  });
});
