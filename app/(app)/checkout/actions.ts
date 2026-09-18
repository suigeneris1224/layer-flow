"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { getFarmContext, requireUser } from "@/lib/auth/session";
import { canManageBilling } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PLANS, priceCentavosFor } from "@/lib/subscriptions/plans";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import { manualPaymentSubmitSchema, toFieldErrors } from "@/lib/validation/schemas";
import {
  describeDatabaseError,
  describeUnknownError,
  failure,
  type ActionResult,
} from "@/lib/errors";
import { consumeRateLimit } from "@/lib/data/rate-limit";
import { formatRetryMessage } from "@/lib/domain/rate-limit";

const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
const RECEIPT_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

/**
 * First bytes of each accepted format. `file.type` is just a client-supplied
 * header on the multipart request -- trivially spoofed by anyone calling this
 * action directly rather than through the file picker's `accept` attribute
 * (a UI hint only). Checking the actual bytes closes that gap without adding
 * a dependency.
 */
const FILE_SIGNATURES: Record<string, (head: Uint8Array) => boolean> = {
  "image/jpeg": (head) => head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff,
  "image/png": (head) =>
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47 &&
    head[4] === 0x0d &&
    head[5] === 0x0a &&
    head[6] === 0x1a &&
    head[7] === 0x0a,
  "application/pdf": (head) =>
    head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46, // "%PDF"
};

async function matchesFileSignature(file: File, mimeType: string): Promise<boolean> {
  const check = FILE_SIGNATURES[mimeType];
  if (!check) return false;
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  return check(head);
}

/**
 * Submit a manual QR/bank transfer payment for review.
 *
 * Mirrors app/(app)/farms/actions.ts's uploadFarmPhotoAction for the upload
 * itself (FormData, MIME allow-list, size cap), but writes to the private
 * `manual-payment-receipts` bucket fenced by owner id, not farm id --
 * subscriptions (and so this) are account-wide. Leaves `subscriptions`
 * untouched: the account keeps its current plan until an admin approves this
 * row (see app/admin/actions.ts's adminApproveManualPaymentAction).
 */
export async function submitManualPaymentAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageBilling(context)) {
    return failure("Only the account owner can submit a payment.");
  }

  const limit = await consumeRateLimit(context.ownerId, "manual_payment");
  if (!limit.allowed) {
    return failure(formatRetryMessage(limit.retryAfterSeconds));
  }

  const parsed = manualPaymentSubmitSchema.safeParse({
    payerName: formData.get("payerName"),
    referenceNumber: formData.get("referenceNumber"),
    plan: formData.get("plan"),
    billingPeriod: formData.get("billingPeriod"),
  });
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0) {
    return failure("Attach your proof of payment.");
  }

  const extension = RECEIPT_TYPES[file.type];
  if (!extension) {
    return failure("Use a JPG, PNG, or PDF file.");
  }
  if (file.size > RECEIPT_MAX_BYTES) {
    return failure("That file is larger than 5 MB. Please choose a smaller one.");
  }
  if (!(await matchesFileSignature(file, file.type))) {
    return failure("That file doesn't look like a valid JPG, PNG, or PDF.");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const paymentId = randomUUID();
    const path = `${context.ownerId}/${paymentId}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("manual-payment-receipts")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      return failure("We couldn't upload that file. Please try again.");
    }

    const plan = PLANS[parsed.data.plan];
    const amountCentavos = priceCentavosFor(plan, parsed.data.billingPeriod);

    const { error } = await supabase.from("manual_payments").insert({
      id: paymentId,
      owner_id: context.ownerId,
      farm_id: context.farmId,
      plan: parsed.data.plan,
      billing_period: parsed.data.billingPeriod,
      amount_centavos: amountCentavos,
      payer_name: parsed.data.payerName,
      reference_number: parsed.data.referenceNumber,
      receipt_storage_path: path,
      status: "PENDING",
    });

    if (error) return describeDatabaseError(error, "submitManualPaymentAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.MANUAL_PAYMENT_SUBMITTED,
      entityType: "manual_payment",
      entityId: paymentId,
      metadata: { plan: parsed.data.plan, billingPeriod: parsed.data.billingPeriod },
    });

    revalidatePath("/settings/billing");
    revalidatePath("/checkout");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "submitManualPaymentAction");
  }
}
