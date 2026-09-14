"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getFarmContext, requireUser } from "@/lib/auth/session";
import { canManageFarmSettings, canManageHouse } from "@/lib/auth/permissions";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import { saveFarmDefaults } from "@/lib/data/farm-defaults";
import { farmDefaultsSchema, toFieldErrors, updateFarmConfigSchema } from "@/lib/validation/schemas";
import {
  describeDatabaseError,
  describeUnknownError,
  failure,
  type ActionResult,
} from "@/lib/errors";

/**
 * Farm configuration -- currency and timezone. A sibling of
 * app/(app)/farms/actions.ts's updateFarmAction, not a replacement: that one
 * owns name/address, this one owns the two columns that feed Intl formatting
 * (lib/format.ts, lib/auth/session.ts's getFarmContext).
 */
export async function updateFarmConfigAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageFarmSettings(context)) {
    return failure("Only the farm owner can change farm configuration.");
  }

  const parsed = updateFarmConfigSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("farms")
      .update({
        currency: parsed.data.currency,
        timezone: parsed.data.timezone,
      })
      .eq("id", context.farmId);

    if (error) return describeDatabaseError(error, "updateFarmConfigAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.FARM_UPDATED,
      entityType: "farm",
      entityId: context.farmId,
      metadata: { currency: parsed.data.currency, timezone: parsed.data.timezone },
    });

    revalidatePath("/settings/farm");
    revalidatePath("/farms");
    revalidatePath("/dashboard");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "updateFarmConfigAction");
  }
}

/**
 * Production defaults -- pre-filled into the "add a house"/"add a flock"
 * forms. Gated at the same MANAGER+ threshold as houses/flocks themselves
 * (canManageHouse === canManageFlock), not OWNER-only like farm
 * configuration -- whoever can add a house or flock can set what it
 * defaults to.
 */
export async function saveFarmDefaultsAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageHouse(context)) {
    return failure("Your role doesn't allow changing production defaults.");
  }

  const parsed = farmDefaultsSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const { error } = await saveFarmDefaults(context.farmId, {
      houseCapacity: parsed.data.defaultHouseCapacity,
      flockBreed: parsed.data.defaultFlockBreed,
    });

    if (error) return describeDatabaseError(error, "saveFarmDefaultsAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.FARM_DEFAULTS_UPDATED,
      entityType: "farm_defaults",
      entityId: context.farmId,
      metadata: {
        defaultHouseCapacity: parsed.data.defaultHouseCapacity,
        defaultFlockBreed: parsed.data.defaultFlockBreed,
      },
    });

    revalidatePath("/settings/farm");
    revalidatePath("/houses");
    revalidatePath("/flocks");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "saveFarmDefaultsAction");
  }
}
