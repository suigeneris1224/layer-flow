import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/observability/logger";
import {
  formulaTotals,
  type FormulaLine,
  type Ingredient,
} from "@/lib/domain/feed-formulation";

/** Reading the farm's own feed ingredients and formulas. Math lives in lib/domain. */

export interface IngredientEntry extends Ingredient {
  notes: string;
  /** Formulas using it -- what blocks delete (deferred FK, checked at commit). */
  usedIn: number;
}

export async function getIngredients(farmId: string): Promise<IngredientEntry[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("feed_ingredients")
    .select(
      "id, name, price_per_kg, protein_pct, energy_kcal_per_kg, calcium_pct, phosphorus_pct, notes, feed_formula_items(count)"
    )
    .eq("farm_id", farmId)
    .order("name");

  if (error) {
    logger.error("feed ingredient lookup failed", { reason: error.message });
    return [];
  }

  return (data ?? []).map((row) => {
    const usage = row.feed_formula_items as unknown as { count: number }[] | null;
    return {
      id: row.id,
      name: row.name,
      pricePerKg: Number(row.price_per_kg),
      proteinPct: Number(row.protein_pct),
      energyKcalPerKg: Number(row.energy_kcal_per_kg),
      calciumPct: Number(row.calcium_pct),
      phosphorusPct: Number(row.phosphorus_pct),
      notes: row.notes ?? "",
      usedIn: usage?.[0]?.count ?? 0,
    };
  });
}

export interface FormulaEntry {
  id: string;
  name: string;
  batchKg: number;
  targetProteinPct: number | null;
  targetEnergy: number | null;
  targetCalciumPct: number | null;
  notes: string;
  lines: FormulaLine[];
}

export async function getFormulas(farmId: string): Promise<FormulaEntry[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("feed_formulas")
    .select(
      "id, name, batch_kg, target_protein_pct, target_energy, target_calcium_pct, notes, feed_formula_items(ingredient_id, percent)"
    )
    .eq("farm_id", farmId)
    .order("name");

  if (error) {
    logger.error("feed formula lookup failed", { reason: error.message });
    return [];
  }

  const num = (value: number | null) => (value === null ? null : Number(value));

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    batchKg: Number(row.batch_kg),
    targetProteinPct: num(row.target_protein_pct),
    targetEnergy: num(row.target_energy),
    targetCalciumPct: num(row.target_calcium_pct),
    notes: row.notes ?? "",
    lines: (row.feed_formula_items ?? []).map((item) => ({
      ingredientId: item.ingredient_id,
      percent: Number(item.percent),
    })),
  }));
}

/** For the feed form's "Use formula" picker: just a name and today's cost per kg. */
export async function getFormulaChoices(
  farmId: string
): Promise<{ id: string; name: string; costPerKg: number }[]> {
  const [formulas, ingredients] = await Promise.all([getFormulas(farmId), getIngredients(farmId)]);
  return formulas.map((formula) => ({
    id: formula.id,
    name: formula.name,
    costPerKg: formulaTotals(formula.lines, ingredients, formula.batchKg).costPerKg,
  }));
}
