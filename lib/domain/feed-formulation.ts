/**
 * Feed formulation math.
 *
 * Every number going in -- ingredient nutrients, prices, targets -- is the
 * farm's own, from its supplier's label or its nutritionist. LayerFlow ships
 * no ingredient values and no recipe, and does no optimisation: it only adds
 * up what the farm put in. Same stance as lib/domain/alerts.ts.
 *
 * Pure module, no I/O.
 */

export interface Ingredient {
  id: string;
  name: string;
  pricePerKg: number;
  proteinPct: number;
  energyKcalPerKg: number;
  calciumPct: number;
  phosphorusPct: number;
}

export interface FormulaLine {
  ingredientId: string;
  /** Share of the mix, 0-100. */
  percent: number;
}

export interface FormulaTotals {
  totalPercent: number;
  /** Within 0.01 of 100 -- what the editor checks before saving. */
  isComplete: boolean;
  proteinPct: number;
  energyKcalPerKg: number;
  calciumPct: number;
  phosphorusPct: number;
  costPerKg: number;
  /** kg of each ingredient for the batch, in line order. */
  batch: { ingredientId: string; name: string; kg: number; cost: number }[];
  batchCost: number;
}

const round = (value: number, places: number) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

/**
 * Weighted averages and cost for a mix. Lines naming an unknown ingredient
 * are ignored. Nutrients are per kg of the finished mix, as if the lines add
 * to 100% -- when they don't, `isComplete` is false and the editor says so.
 */
export function formulaTotals(
  lines: readonly FormulaLine[],
  ingredients: readonly Ingredient[],
  batchKg: number
): FormulaTotals {
  const byId = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const known = lines
    .map((line) => ({ line, ingredient: byId.get(line.ingredientId) }))
    .filter(
      (entry): entry is { line: FormulaLine; ingredient: Ingredient } =>
        entry.ingredient !== undefined && entry.line.percent > 0
    );

  const totalPercent = known.reduce((total, { line }) => total + line.percent, 0);
  const weighted = (pick: (ingredient: Ingredient) => number) =>
    known.reduce((total, { line, ingredient }) => total + (line.percent / 100) * pick(ingredient), 0);

  const batch = known.map(({ line, ingredient }) => {
    const kg = (line.percent / 100) * batchKg;
    return {
      ingredientId: ingredient.id,
      name: ingredient.name,
      kg: round(kg, 2),
      cost: round(kg * ingredient.pricePerKg, 2),
    };
  });

  return {
    totalPercent: round(totalPercent, 3),
    isComplete: Math.abs(totalPercent - 100) < 0.01,
    proteinPct: round(weighted((i) => i.proteinPct), 2),
    energyKcalPerKg: round(weighted((i) => i.energyKcalPerKg), 0),
    calciumPct: round(weighted((i) => i.calciumPct), 2),
    phosphorusPct: round(weighted((i) => i.phosphorusPct), 2),
    costPerKg: round(weighted((i) => i.pricePerKg), 2),
    batch,
    batchCost: round(
      batch.reduce((total, line) => total + line.cost, 0),
      2
    ),
  };
}

/**
 * Pearson square: the two-ingredient mix that hits a protein target.
 *
 * The hand method taught in DA and extension trainings. Each ingredient's
 * share is the distance from the *other* ingredient's protein to the target.
 * Null when the target isn't strictly between the two values -- no mix of
 * them can reach it.
 */
export function pearsonSquare(
  lowProteinPct: number,
  highProteinPct: number,
  targetPct: number
): { lowPercent: number; highPercent: number } | null {
  const low = Math.min(lowProteinPct, highProteinPct);
  const high = Math.max(lowProteinPct, highProteinPct);
  if (!(targetPct > low && targetPct < high)) return null;

  const lowParts = high - targetPct;
  const highParts = targetPct - low;
  const total = lowParts + highParts;
  const lowPercent = round((lowParts / total) * 100, 2);
  const highPercent = round(100 - lowPercent, 2);

  // Map back onto the order the caller passed them in.
  return lowProteinPct <= highProteinPct
    ? { lowPercent, highPercent }
    : { lowPercent: highPercent, highPercent: lowPercent };
}
