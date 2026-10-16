"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getFarmContext, requireUser } from "@/lib/auth/session";
import { canManageFeedFormulas } from "@/lib/auth/permissions";
import { assertCanAccess } from "@/lib/subscriptions/entitlements";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import {
  feedFormulaSchema,
  feedIngredientSchema,
  toFieldErrors,
  uuid,
} from "@/lib/validation/schemas";
import {
  describeDatabaseError,
  describeUnknownError,
  failure,
  type ActionResult,
} from "@/lib/errors";

/**
 * Feed ingredients and formulas: farm configuration, MANAGER+, plan gate
 * `feed_formulation` (Starter+). Gate order: who, farm, role, input, plan.
 */

function revalidateFormulas(): void {
  revalidatePath("/feed/formulas");
  revalidatePath("/health");
  revalidatePath("/production/new");
}

async function formulaContext() {
  const user = await requireUser();
  const context = await getFarmContext();
  if (!context) return { allowed: false as const, denial: failure("Set up your farm first.") };
  if (!canManageFeedFormulas(context)) {
    return {
      allowed: false as const,
      denial: failure("Only the farm owner or a manager can change feed formulas."),
    };
  }
  return { allowed: true as const, user, context };
}

export async function saveIngredientAction(
  ingredientId: string | null,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const gate = await formulaContext();
  if (!gate.allowed) return gate.denial;
  const { user, context } = gate;

  const parsed = feedIngredientSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the ingredient below.", toFieldErrors(parsed.error));
  }
  if (ingredientId !== null && !uuid.safeParse(ingredientId).success) {
    return failure("That ingredient no longer exists.");
  }

  try {
    assertCanAccess(
      { plan: context.plan, status: context.subscriptionStatus },
      "feed_formulation"
    );

    const values = {
      name: parsed.data.name,
      price_per_kg: parsed.data.pricePerKg,
      protein_pct: parsed.data.proteinPct,
      energy_kcal_per_kg: parsed.data.energyKcalPerKg,
      calcium_pct: parsed.data.calciumPct,
      phosphorus_pct: parsed.data.phosphorusPct,
      notes: parsed.data.notes || null,
    };

    const supabase = await createSupabaseServerClient();
    const { data, error } = ingredientId
      ? await supabase
          .from("feed_ingredients")
          .update(values)
          .eq("id", ingredientId)
          .eq("farm_id", context.farmId)
          .select("id")
          .maybeSingle()
      : await supabase
          .from("feed_ingredients")
          .insert({ farm_id: context.farmId, ...values })
          .select("id")
          .single();

    if (error) {
      if (error.code === "23505") {
        return failure("You already have an ingredient with that name.", {
          name: "Already in your list",
        });
      }
      return describeDatabaseError(error, "saveIngredientAction");
    }
    if (!data) return failure("That ingredient no longer exists.");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.FEED_INGREDIENT_SAVED,
      entityType: "feed_ingredient",
      entityId: data.id,
      metadata: { name: parsed.data.name, pricePerKg: parsed.data.pricePerKg },
    });

    revalidateFormulas();
    return { ok: true, data: { id: data.id } };
  } catch (error) {
    return describeUnknownError(error, "saveIngredientAction");
  }
}

export async function deleteIngredientAction(ingredientId: string): Promise<ActionResult> {
  const gate = await formulaContext();
  if (!gate.allowed) return gate.denial;
  const { user, context } = gate;

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("feed_ingredients")
      .delete()
      .eq("id", ingredientId)
      .eq("farm_id", context.farmId);

    if (error) {
      if (error.code === "23503") {
        return failure("This ingredient is used in a formula. Remove it from the formula first.");
      }
      return describeDatabaseError(error, "deleteIngredientAction");
    }

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.FEED_INGREDIENT_DELETED,
      entityType: "feed_ingredient",
      entityId: ingredientId,
    });

    revalidateFormulas();
    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "deleteIngredientAction");
  }
}

export async function saveFormulaAction(
  formulaId: string | null,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const gate = await formulaContext();
  if (!gate.allowed) return gate.denial;
  const { user, context } = gate;

  const parsed = feedFormulaSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the formula below.", toFieldErrors(parsed.error));
  }
  if (formulaId !== null && !uuid.safeParse(formulaId).success) {
    return failure("That formula no longer exists.");
  }

  try {
    assertCanAccess(
      { plan: context.plan, status: context.subscriptionStatus },
      "feed_formulation"
    );

    const supabase = await createSupabaseServerClient();
    const { data: savedId, error } = await supabase.rpc("save_feed_formula", {
      p_formula_id: formulaId ?? undefined,
      p_farm_id: context.farmId,
      p_name: parsed.data.name,
      p_batch_kg: parsed.data.batchKg,
      p_target_protein_pct: parsed.data.targetProteinPct ?? undefined,
      p_target_energy: parsed.data.targetEnergy ?? undefined,
      p_target_calcium_pct: parsed.data.targetCalciumPct ?? undefined,
      p_notes: parsed.data.notes || undefined,
      p_items: parsed.data.items.map((item) => ({
        ingredient_id: item.ingredientId,
        percent: item.percent,
      })),
    });

    if (error) {
      if (error.code === "23505") {
        return failure("You already have a formula with that name.", {
          name: "Already in your list",
        });
      }
      return describeDatabaseError(error, "saveFormulaAction");
    }
    if (!savedId) return failure("We couldn't save that formula. Please try again.");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.FEED_FORMULA_SAVED,
      entityType: "feed_formula",
      entityId: savedId,
      metadata: { name: parsed.data.name, lines: parsed.data.items.length },
    });

    revalidateFormulas();
    return { ok: true, data: { id: savedId } };
  } catch (error) {
    return describeUnknownError(error, "saveFormulaAction");
  }
}

export async function deleteFormulaAction(formulaId: string): Promise<ActionResult> {
  const gate = await formulaContext();
  if (!gate.allowed) return gate.denial;
  const { user, context } = gate;

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("feed_formulas")
      .delete()
      .eq("id", formulaId)
      .eq("farm_id", context.farmId);

    if (error) return describeDatabaseError(error, "deleteFormulaAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.FEED_FORMULA_DELETED,
      entityType: "feed_formula",
      entityId: formulaId,
    });

    revalidateFormulas();
    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "deleteFormulaAction");
  }
}
