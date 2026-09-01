"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireFarmContext } from "@/lib/auth/session";
import { describeDatabaseError, describeUnknownError, type ActionResult } from "@/lib/errors";

/** Read state is farm-wide, not per-teammate -- see lib/data/notifications.ts. */

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  try {
    const context = await requireFarmContext();
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("farm_id", context.farmId);

    if (error) return describeDatabaseError(error, "markNotificationReadAction");

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "markNotificationReadAction");
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  try {
    const context = await requireFarmContext();
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("farm_id", context.farmId)
      .is("read_at", null);

    if (error) return describeDatabaseError(error, "markAllNotificationsReadAction");

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "markAllNotificationsReadAction");
  }
}
