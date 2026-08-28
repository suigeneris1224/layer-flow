"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getFarmContext, requireUser } from "@/lib/auth/session";
import { canManagePricing } from "@/lib/auth/permissions";
import { getOpenPrice } from "@/lib/data/pricing";
import { planPriceChange } from "@/lib/domain/pricing";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import { eggPriceRowSchema, toFieldErrors } from "@/lib/validation/schemas";
import { farmToday } from "@/lib/format";
import {
  describeDatabaseError,
  describeUnknownError,
  failure,
  type ActionResult,
} from "@/lib/errors";

const setPriceSchema = eggPriceRowSchema.extend({
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date"),
});

/**
 * Set the price for one egg size.
 *
 * The plan is worked out here with the same pure function the browser used, so
 * an impossible change is refused with a readable sentence before the database
 * is touched. `set_egg_price` then applies it atomically -- it re-derives the
 * same decision server-side, because the row may have moved between the read
 * and the write.
 */
export async function setPriceAction(
  input: unknown
): Promise<ActionResult<{ priceId: string }>> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManagePricing(context)) {
    return failure("Your role doesn't allow changing prices.");
  }

  const parsed = setPriceSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  const values = parsed.data;

  try {
    const current = await getOpenPrice(context.farmId, values.eggSizeId);
    const today = farmToday(context.timezone);

    const plan = planPriceChange(current, values.effectiveFrom, today);
    if (!plan.ok) {
      return failure(plan.message, { effectiveFrom: plan.message });
    }

    const supabase = await createSupabaseServerClient();
    const { data: priceId, error } = await supabase.rpc("set_egg_price", {
      p_egg_size_id: values.eggSizeId,
      p_price_per_egg: values.pricePerEgg,
      p_price_per_tray: values.pricePerTray,
      p_effective_from: values.effectiveFrom,
    });

    if (error) return describeDatabaseError(error, "setPriceAction");
    if (!priceId) return failure("We couldn't save that price. Please try again.");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.PRICES_UPDATED,
      entityType: "egg_price",
      entityId: priceId,
      metadata: {
        eggSizeId: values.eggSizeId,
        pricePerEgg: values.pricePerEgg,
        pricePerTray: values.pricePerTray,
        effectiveFrom: values.effectiveFrom,
        previousPricePerTray: current?.pricePerTray ?? null,
        appliedAs: plan.plan.action,
      },
    });

    revalidatePath("/prices");
    revalidatePath("/dashboard");

    return { ok: true, data: { priceId } };
  } catch (error) {
    return describeUnknownError(error, "setPriceAction");
  }
}
