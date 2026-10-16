"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getFarmContext, requireUser } from "@/lib/auth/session";
import { canRecordBiosecurity } from "@/lib/auth/permissions";
import { assertCanAccess } from "@/lib/subscriptions/entitlements";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import {
  biosecurityCheckSchema,
  biosecurityVisitSchema,
  toFieldErrors,
} from "@/lib/validation/schemas";
import {
  describeDatabaseError,
  describeUnknownError,
  failure,
  type ActionResult,
} from "@/lib/errors";

/**
 * Biosecurity visits and checks. Any member may record (the worker at the
 * gate sees the visitor); the plan gate is `biosecurity`, Starter+. Gate
 * order: who, which farm, role, input, plan.
 */

function revalidateBiosecurity(): void {
  revalidatePath("/biosecurity");
  revalidatePath("/dashboard");
}

async function biosecurityContext(verb: string) {
  const user = await requireUser();
  const context = await getFarmContext();
  if (!context) return { allowed: false as const, denial: failure("Set up your farm first.") };
  if (!canRecordBiosecurity(context)) {
    return { allowed: false as const, denial: failure(`Your role doesn't allow ${verb}.`) };
  }
  return { allowed: true as const, user, context };
}

export async function recordVisitAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const gate = await biosecurityContext("logging visitors");
  if (!gate.allowed) return gate.denial;
  const { user, context } = gate;

  const parsed = biosecurityVisitSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the visit below.", toFieldErrors(parsed.error));
  }

  try {
    assertCanAccess({ plan: context.plan, status: context.subscriptionStatus }, "biosecurity");

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("biosecurity_visits")
      .insert({
        farm_id: context.farmId,
        visit_date: parsed.data.visitDate,
        visitor_name: parsed.data.visitorName,
        purpose: parsed.data.purpose || null,
        vehicle_plate: parsed.data.vehiclePlate || null,
        last_poultry_contact_date: parsed.data.lastPoultryContactDate || null,
        disinfected: parsed.data.disinfected,
        notes: parsed.data.notes || null,
        recorded_by: user.id,
      })
      .select("id")
      .single();

    if (error) return describeDatabaseError(error, "recordVisitAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.BIOSECURITY_VISIT_RECORDED,
      entityType: "biosecurity_visit",
      entityId: data.id,
      metadata: { date: parsed.data.visitDate, visitor: parsed.data.visitorName },
    });

    revalidateBiosecurity();
    return { ok: true, data: { id: data.id } };
  } catch (error) {
    return describeUnknownError(error, "recordVisitAction");
  }
}

export async function deleteVisitAction(visitId: string): Promise<ActionResult> {
  const gate = await biosecurityContext("deleting visits");
  if (!gate.allowed) return gate.denial;
  const { user, context } = gate;

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("biosecurity_visits")
      .delete()
      .eq("id", visitId)
      .eq("farm_id", context.farmId);

    if (error) return describeDatabaseError(error, "deleteVisitAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.BIOSECURITY_VISIT_DELETED,
      entityType: "biosecurity_visit",
      entityId: visitId,
    });

    revalidateBiosecurity();
    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "deleteVisitAction");
  }
}

export async function recordCheckAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const gate = await biosecurityContext("logging checks");
  if (!gate.allowed) return gate.denial;
  const { user, context } = gate;

  const parsed = biosecurityCheckSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the entry below.", toFieldErrors(parsed.error));
  }

  try {
    assertCanAccess({ plan: context.plan, status: context.subscriptionStatus }, "biosecurity");

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("biosecurity_checks")
      .insert({
        farm_id: context.farmId,
        check_date: parsed.data.checkDate,
        check_type: parsed.data.checkType,
        house_id: parsed.data.houseId || null,
        notes: parsed.data.notes || null,
        recorded_by: user.id,
      })
      .select("id")
      .single();

    if (error) return describeDatabaseError(error, "recordCheckAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.BIOSECURITY_CHECK_RECORDED,
      entityType: "biosecurity_check",
      entityId: data.id,
      metadata: { date: parsed.data.checkDate, type: parsed.data.checkType },
    });

    revalidateBiosecurity();
    return { ok: true, data: { id: data.id } };
  } catch (error) {
    return describeUnknownError(error, "recordCheckAction");
  }
}

export async function deleteCheckAction(checkId: string): Promise<ActionResult> {
  const gate = await biosecurityContext("deleting checks");
  if (!gate.allowed) return gate.denial;
  const { user, context } = gate;

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("biosecurity_checks")
      .delete()
      .eq("id", checkId)
      .eq("farm_id", context.farmId);

    if (error) return describeDatabaseError(error, "deleteCheckAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.BIOSECURITY_CHECK_DELETED,
      entityType: "biosecurity_check",
      entityId: checkId,
    });

    revalidateBiosecurity();
    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "deleteCheckAction");
  }
}
