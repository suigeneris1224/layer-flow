"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getFarmContext, requireUser } from "@/lib/auth/session";
import { canManageEggSizes, canManagePricing } from "@/lib/auth/permissions";
import { getOpenPrice } from "@/lib/data/pricing";
import { planPriceChange } from "@/lib/domain/pricing";
import { slugifyEggSizeCode } from "@/lib/domain/egg-sizes";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import {
  createEggSizeSchema,
  eggPriceRowSchema,
  toFieldErrors,
  updateEggSizeSchema,
} from "@/lib/validation/schemas";
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

/**
 * Add a new egg size.
 *
 * `code` is derived once from the name and never re-derived on a later
 * rename (see lib/domain/egg-sizes.ts's slugifyEggSizeCode). Appended after
 * every existing size, active or not -- sort_order is one shared sequence
 * for the whole farm, not just the active subset, so a re-enabled size lands
 * back in a sensible place rather than jumping to the front.
 */
export async function createEggSizeAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageEggSizes(context)) {
    return failure("Your role doesn't allow adding egg sizes.");
  }

  const parsed = createEggSizeSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { data: last } = await supabase
      .from("egg_sizes")
      .select("sort_order")
      .eq("farm_id", context.farmId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await supabase
      .from("egg_sizes")
      .insert({
        farm_id: context.farmId,
        name: parsed.data.name,
        code: slugifyEggSizeCode(parsed.data.name),
        sort_order: (last?.sort_order ?? 0) + 1,
      })
      .select("id")
      .single();

    if (error) return describeDatabaseError(error, "createEggSizeAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.EGG_SIZES_CONFIGURED,
      entityType: "egg_size",
      entityId: data.id,
      metadata: { change: "created", name: parsed.data.name },
    });

    revalidatePath("/prices");

    return { ok: true, data: { id: data.id } };
  } catch (error) {
    return describeUnknownError(error, "createEggSizeAction");
  }
}

/** Rename an existing egg size. The code it was created with never changes. */
export async function updateEggSizeAction(
  eggSizeId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageEggSizes(context)) {
    return failure("Your role doesn't allow editing egg sizes.");
  }

  const parsed = updateEggSizeSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("egg_sizes")
      .update({ name: parsed.data.name })
      .eq("id", eggSizeId)
      .eq("farm_id", context.farmId)
      .select("id")
      .maybeSingle();

    if (error) return describeDatabaseError(error, "updateEggSizeAction");
    if (!data) return failure("That egg size no longer exists.");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.EGG_SIZES_CONFIGURED,
      entityType: "egg_size",
      entityId: eggSizeId,
      metadata: { change: "renamed", name: parsed.data.name },
    });

    revalidatePath("/prices");

    return { ok: true, data: { id: eggSizeId } };
  } catch (error) {
    return describeUnknownError(error, "updateEggSizeAction");
  }
}

/**
 * Enable or disable an egg size.
 *
 * Never a hard delete: a size can be recorded against months of production,
 * sales and inventory history. Disabling just drops it from the sizes new
 * production/sales entries and getCurrentPrices offer -- every past record
 * and current inventory balance for it is untouched and still visible.
 */
export async function setEggSizeActiveAction(
  eggSizeId: string,
  isActive: boolean
): Promise<ActionResult> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageEggSizes(context)) {
    return failure("Your role doesn't allow changing egg sizes.");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("egg_sizes")
      .update({ is_active: isActive })
      .eq("id", eggSizeId)
      .eq("farm_id", context.farmId)
      .select("id")
      .maybeSingle();

    if (error) return describeDatabaseError(error, "setEggSizeActiveAction");
    if (!data) return failure("That egg size no longer exists.");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.EGG_SIZES_CONFIGURED,
      entityType: "egg_size",
      entityId: eggSizeId,
      metadata: { change: isActive ? "enabled" : "disabled" },
    });

    revalidatePath("/prices");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "setEggSizeActiveAction");
  }
}

/**
 * Move an egg size up or down one slot.
 *
 * Swaps `sort_order` with its immediate neighbor across the farm's full size
 * list (active and disabled together, same ordering domain createEggSizeAction
 * appends onto) -- not a database transaction, just two updates, which is fine
 * for a low-stakes settings reorder; a failure between them leaves two rows
 * with duplicate sort_order, which display code already tolerates (sorted,
 * ties broken by whatever order the database returns).
 */
export async function moveEggSizeAction(
  eggSizeId: string,
  direction: "UP" | "DOWN"
): Promise<ActionResult> {
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageEggSizes(context)) {
    return failure("Your role doesn't allow reordering egg sizes.");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: sizes, error: listError } = await supabase
      .from("egg_sizes")
      .select("id, sort_order")
      .eq("farm_id", context.farmId)
      .order("sort_order", { ascending: true });

    if (listError) return describeDatabaseError(listError, "moveEggSizeAction");

    const rows = sizes ?? [];
    const index = rows.findIndex((row) => row.id === eggSizeId);
    if (index === -1) return failure("That egg size no longer exists.");

    const neighborIndex = direction === "UP" ? index - 1 : index + 1;
    if (neighborIndex < 0 || neighborIndex >= rows.length) {
      return failure(direction === "UP" ? "Already at the top." : "Already at the bottom.");
    }

    const current = rows[index];
    const neighbor = rows[neighborIndex];

    const [a, b] = await Promise.all([
      supabase
        .from("egg_sizes")
        .update({ sort_order: neighbor.sort_order })
        .eq("id", current.id)
        .eq("farm_id", context.farmId),
      supabase
        .from("egg_sizes")
        .update({ sort_order: current.sort_order })
        .eq("id", neighbor.id)
        .eq("farm_id", context.farmId),
    ]);

    if (a.error) return describeDatabaseError(a.error, "moveEggSizeAction");
    if (b.error) return describeDatabaseError(b.error, "moveEggSizeAction");

    revalidatePath("/prices");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "moveEggSizeAction");
  }
}
