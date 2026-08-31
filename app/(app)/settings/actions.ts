"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getFarmContext, requireUser } from "@/lib/auth/session";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import { toFieldErrors, updateProfileSchema } from "@/lib/validation/schemas";
import {
  describeDatabaseError,
  describeUnknownError,
  failure,
  type ActionResult,
} from "@/lib/errors";

/**
 * The signed-in user's own profile.
 *
 * These are the only actions in the app that are not farm-scoped: a profile
 * belongs to a person, not a farm, and a user with no farm yet still has one.
 * So there is no `getFarmContext()` gate and no role check -- the id always
 * comes from the verified session, never from the client, and
 * `profiles_update_self` enforces the same rule in the database.
 *
 * The farm context is read only to attribute the audit entry, and its absence
 * is not an error.
 */

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: parsed.data.fullName,
        phone: parsed.data.phone || null,
      })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();

    if (error) return describeDatabaseError(error, "updateProfileAction");
    if (!data) return failure("We couldn't find your profile.");

    // Keep auth metadata in step: the topbar and the session read full_name
    // from there, so leaving it stale would show the old name until sign-out.
    await supabase.auth.updateUser({ data: { full_name: parsed.data.fullName } });

    const context = await getFarmContext();
    if (context) {
      await recordAuditLog({
        farmId: context.farmId,
        userId: user.id,
        action: AUDIT_ACTIONS.PROFILE_UPDATED,
        entityType: "profile",
        entityId: user.id,
      });
    }

    revalidatePath("/settings");
    revalidatePath("/dashboard");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "updateProfileAction");
  }
}

/**
 * Avatar upload.
 *
 * Written to `avatars/<user id>/avatar.<ext>`; the storage policies fence a
 * user to their own folder by that first path segment. Upserting to a stable
 * name means a user keeps one avatar rather than accumulating orphans, and the
 * public URL carries a cache-busting query so the browser picks up the change.
 */
export async function uploadAvatarAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return failure("Choose an image to upload.");
  }

  const extension = AVATAR_TYPES[file.type];
  if (!extension) {
    return failure("Use a JPG, PNG or WebP image.");
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return failure("That image is larger than 2 MB. Please choose a smaller one.");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const path = `${user.id}/avatar.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      return failure("We couldn't upload that image. Please try again.");
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: `${publicUrl}?v=${Date.now()}` })
      .eq("id", user.id);

    if (error) return describeDatabaseError(error, "uploadAvatarAction");

    revalidatePath("/settings");
    revalidatePath("/dashboard");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "uploadAvatarAction");
  }
}

/** Clearing the avatar falls back to the initials the topbar drew before. */
export async function removeAvatarAction(): Promise<ActionResult> {
  const user = await requireUser();

  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", user.id);

    if (error) return describeDatabaseError(error, "removeAvatarAction");

    // Best-effort: the row is what the UI reads, so a failed object delete
    // leaves a harmless orphan rather than a broken avatar.
    await supabase.storage
      .from("avatars")
      .remove(Object.values(AVATAR_TYPES).map((ext) => `${user.id}/avatar.${ext}`));

    revalidatePath("/settings");
    revalidatePath("/dashboard");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "removeAvatarAction");
  }
}
