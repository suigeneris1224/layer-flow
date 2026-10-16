import { describe, expect, it } from "vitest";
import { formulaTotals, pearsonSquare, type Ingredient } from "@/lib/domain/feed-formulation";

// Made-up values for the math only -- LayerFlow ships no ingredient data.
const grain: Ingredient = {
  id: "a",
  name: "Grain",
  pricePerKg: 20,
  proteinPct: 9,
  energyKcalPerKg: 3300,
  calciumPct: 0.02,
  phosphorusPct: 0.3,
};
const meal: Ingredient = {
  id: "b",
  name: "Meal",
  pricePerKg: 40,
  proteinPct: 44,
  energyKcalPerKg: 2400,
  calciumPct: 0.3,
  phosphorusPct: 0.6,
};
const shell: Ingredient = {
  id: "c",
  name: "Shell",
  pricePerKg: 5,
  proteinPct: 0,
  energyKcalPerKg: 0,
  calciumPct: 38,
  phosphorusPct: 0,
};

describe("formulaTotals", () => {
  it("weights nutrients and cost by each line's share", () => {
    const totals = formulaTotals(
      [
        { ingredientId: "a", percent: 60 },
        { ingredientId: "b", percent: 30 },
        { ingredientId: "c", percent: 10 },
      ],
      [grain, meal, shell],
      50
    );

    expect(totals.isComplete).toBe(true);
    expect(totals.proteinPct).toBe(18.6); // 0.6*9 + 0.3*44
    expect(totals.energyKcalPerKg).toBe(2700); // 0.6*3300 + 0.3*2400
    expect(totals.calciumPct).toBe(3.9); // 0.6*0.02 + 0.3*0.3 + 0.1*38
    expect(totals.costPerKg).toBe(24.5); // 0.6*20 + 0.3*40 + 0.1*5
    expect(totals.batch).toEqual([
      { ingredientId: "a", name: "Grain", kg: 30, cost: 600 },
      { ingredientId: "b", name: "Meal", kg: 15, cost: 600 },
      { ingredientId: "c", name: "Shell", kg: 5, cost: 25 },
    ]);
    expect(totals.batchCost).toBe(1225);
  });

  it("flags a mix that doesn't add to 100% and ignores unknown ingredients", () => {
    const totals = formulaTotals(
      [
        { ingredientId: "a", percent: 50 },
        { ingredientId: "missing", percent: 50 },
      ],
      [grain],
      100
    );
    expect(totals.totalPercent).toBe(50);
    expect(totals.isComplete).toBe(false);
  });

  it("is all zeros for an empty mix", () => {
    const totals = formulaTotals([], [grain], 100);
    expect(totals).toMatchObject({ totalPercent: 0, proteinPct: 0, costPerKg: 0, batchCost: 0 });
  });
});

describe("pearsonSquare", () => {
  it("gives 70/30 for 9% and 44% protein at a 19.5% target", () => {
    expect(pearsonSquare(9, 44, 19.5)).toEqual({ lowPercent: 70, highPercent: 30 });
  });

  it("keeps the caller's order when the higher-protein ingredient comes first", () => {
    expect(pearsonSquare(44, 9, 19.5)).toEqual({ lowPercent: 30, highPercent: 70 });
  });

  it("is null when the target can't be reached by mixing the two", () => {
    expect(pearsonSquare(9, 44, 50)).toBeNull();
    expect(pearsonSquare(9, 44, 9)).toBeNull();
    expect(pearsonSquare(20, 20, 20)).toBeNull();
  });
});
