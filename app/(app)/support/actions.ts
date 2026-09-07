"use server";

import { requireFarmContext, requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import { supportRequestSchema, toFieldErrors } from "@/lib/validation/schemas";
import { sendEmail } from "@/lib/email/client";
import { buildSupportRequestNotificationEmail } from "@/lib/email/templates";
import { logger } from "@/lib/observability/logger";
import {
  describeDatabaseError,
  describeUnknownError,
  failure,
  type ActionResult,
} from "@/lib/errors";

/** Where a new request notifies -- same inbox app/contact/page.tsx points visitors to. */
const SUPPORT_EMAIL = "support@layerflow.ph";

/**
 * File a support request.
 *
 * `priority` is decided once, here, from the submitter's plan/beta status --
 * it is not recalculated later, so a plan change afterward doesn't reorder a
 * request already sitting in the admin queue. The notification email is
 * best-effort: a failed send must never block the request from being saved.
 */
export async function submitSupportRequestAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const context = await requireFarmContext();

  const parsed = supportRequestSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  const priority = context.plan === "PRO" || context.isBetaOverride;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("support_requests")
      .insert({
        farm_id: context.farmId,
        submitted_by: user.id,
        subject: parsed.data.subject,
        message: parsed.data.message,
        priority,
      })
      .select("id")
      .single();

    if (error) return describeDatabaseError(error, "submitSupportRequestAction");

    const email = buildSupportRequestNotificationEmail({
      farmName: context.farmName,
      submitterEmail: user.email,
      priority,
      subject: parsed.data.subject,
      message: parsed.data.message,
    });
    const sent = await sendEmail({
      to: { email: SUPPORT_EMAIL },
      subject: email.subject,
      htmlContent: email.html,
      textContent: email.text,
    });
    if (!sent.ok) {
      // Best-effort, matches recordAuditLog's philosophy: the request is
      // already saved and the admin panel will show it either way.
      logger.warn("support request email failed", { reason: sent.error });
    }

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.SUPPORT_REQUEST_CREATED,
      entityType: "support_request",
      entityId: data.id,
      metadata: { priority, subject: parsed.data.subject },
    });

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "submitSupportRequestAction");
  }
}
