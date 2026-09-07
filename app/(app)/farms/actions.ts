"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ACTIVE_FARM_COOKIE, getFarmContext, getUserFarms, requireUser } from "@/lib/auth/session";
import { canManageFarmSettings } from "@/lib/auth/permissions";
import { assertCanCreate } from "@/lib/subscriptions/entitlements";
import { getFarmCountForUser } from "@/lib/data/farms";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import { createFarmSchema, toFieldErrors, updateFarmSchema } from "@/lib/validation/schemas";
import {
  describeDatabaseError,
  describeUnknownError,
  failure,
  type ActionResult,
} from "@/lib/errors";

const FARM_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const FARM_PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function updateFarmAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageFarmSettings(context)) {
    return failure("Only the farm owner can change farm details.");
  }

  const parsed = updateFarmSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("farms")
      .update({
        name: parsed.data.name,
        barangay: parsed.data.barangay || null,
        municipality: parsed.data.municipality,
        province: parsed.data.province,
      })
      .eq("id", context.farmId);

    if (error) return describeDatabaseError(error, "updateFarmAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.FARM_UPDATED,
      entityType: "farm",
      entityId: context.farmId,
      metadata: { name: parsed.data.name },
    });

    revalidatePath("/farms");
    revalidatePath("/dashboard");

    return { ok: true, data: { id: context.farmId } };
  } catch (error) {
    return describeUnknownError(error, "updateFarmAction");
  }
}

/**
 * Farm photo upload -- same shape as settings' avatar/cover uploads
 * (app/(app)/settings/actions.ts), but the folder is fenced by farm id
 * (farm-photos/<farm id>/<file>) and gated to OWNER, since a farm's photo is
 * shared by everyone on it rather than owned by the uploader.
 */
export async function uploadFarmPhotoAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageFarmSettings(context)) {
    return failure("Only the farm owner can change the farm photo.");
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return failure("Choose an image to upload.");
  }

  const extension = FARM_PHOTO_TYPES[file.type];
  if (!extension) {
    return failure("Use a JPG, PNG or WebP image.");
  }
  if (file.size > FARM_PHOTO_MAX_BYTES) {
    return failure("That image is larger than 5 MB. Please choose a smaller one.");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const path = `${context.farmId}/photo.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("farm-photos")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      return failure("We couldn't upload that image. Please try again.");
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("farm-photos").getPublicUrl(path);

    const { error } = await supabase
      .from("farms")
      .update({ photo_url: `${publicUrl}?v=${Date.now()}` })
      .eq("id", context.farmId);

    if (error) return describeDatabaseError(error, "uploadFarmPhotoAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.FARM_UPDATED,
      entityType: "farm",
      entityId: context.farmId,
    });

    revalidatePath("/farms");
    revalidatePath("/dashboard");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "uploadFarmPhotoAction");
  }
}

export async function removeFarmPhotoAction(): Promise<ActionResult> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageFarmSettings(context)) {
    return failure("Only the farm owner can change the farm photo.");
  }

  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("farms")
      .update({ photo_url: null })
      .eq("id", context.farmId);

    if (error) return describeDatabaseError(error, "removeFarmPhotoAction");

    // Best-effort: the row is what the UI reads, so a failed object delete
    // leaves a harmless orphan rather than a broken photo.
    await supabase.storage
      .from("farm-photos")
      .remove(Object.values(FARM_PHOTO_TYPES).map((ext) => `${context.farmId}/photo.${ext}`));

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.FARM_UPDATED,
      entityType: "farm",
      entityId: context.farmId,
    });

    revalidatePath("/farms");
    revalidatePath("/dashboard");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "removeFarmPhotoAction");
  }
}

/**
 * Add another farm once the wizard has already run once.
 *
 * Mirrors onboarding's `createFarmAction` (same insert, same default egg
 * sizes) minus the redirect into the wizard -- a second farm starts empty and
 * is filled in from /houses and /flocks, which the wizard's later steps
 * cannot yet do for a farm that isn't brand new.
 */
export async function createFarmAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();

  const parsed = createFarmSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const context = await getFarmContext();
    const existingFarms = await getFarmCountForUser(user.id);

    assertCanCreate(
      { plan: context?.plan ?? "FREE", status: context?.subscriptionStatus ?? "ACTIVE" },
      "farms",
      existingFarms
    );

    const supabase = await createSupabaseServerClient();

    // Generated here, not read back -- see the note in app/onboarding/actions.ts.
    // INSERT ... RETURNING applies the SELECT policy in the same statement, and
    // the OWNER membership does not exist in that snapshot yet.
    const newFarmId = randomUUID();

    const { error } = await supabase.from("farms").insert({
      id: newFarmId,
      name: parsed.data.name,
      barangay: parsed.data.barangay || null,
      municipality: parsed.data.municipality,
      province: parsed.data.province,
      // owner_id must match auth.uid() or the RLS check rejects the insert.
      owner_id: user.id,
    });

    if (error) return describeDatabaseError(error, "createFarmAction");

    // Triggers have already added the OWNER membership and a FREE
    // subscription; egg sizes are ours to seed, same as onboarding.
    const { error: sizesError } = await supabase.rpc(
      "seed_default_egg_sizes" as never,
      { farm: newFarmId } as never
    );

    if (sizesError) {
      await supabase.from("egg_sizes").insert([
        { farm_id: newFarmId, name: "Small", code: "SMALL", sort_order: 1 },
        { farm_id: newFarmId, name: "Medium", code: "MEDIUM", sort_order: 2 },
        { farm_id: newFarmId, name: "Large", code: "LARGE", sort_order: 3 },
        { farm_id: newFarmId, name: "Extra Large", code: "EXTRA_LARGE", sort_order: 4 },
        { farm_id: newFarmId, name: "Jumbo", code: "JUMBO", sort_order: 5 },
      ]);
    }

    await recordAuditLog({
      farmId: newFarmId,
      userId: user.id,
      action: AUDIT_ACTIONS.FARM_CREATED,
      entityType: "farm",
      entityId: newFarmId,
      metadata: { name: parsed.data.name },
    });

    revalidatePath("/farms");

    return { ok: true, data: { id: newFarmId } };
  } catch (error) {
    return describeUnknownError(error, "createFarmAction");
  }
}

/**
 * Switch which of the user's own farms subsequent pages act on.
 *
 * The cookie only ever selects among farms the user already belongs to --
 * `getFarmContext` already falls back safely if it's ever tampered with, but
 * this validates up front so a bad request fails with a clear message rather
 * than silently landing on the wrong farm.
 */
export async function switchFarmAction(farmId: string): Promise<ActionResult> {
  await requireUser();
  const farms = await getUserFarms();

  if (!farms.some((farm) => farm.farmId === farmId)) {
    return failure("That farm isn't available to you.");
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_FARM_COOKIE, farmId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");

  return { ok: true };
}
