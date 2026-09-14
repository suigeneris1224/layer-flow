import "server-only";

import { cache } from "react";

import type { PostgrestError } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { NotificationPreferences } from "@/lib/domain/notification-preferences";
import { logger } from "@/lib/observability/logger";

/**
 * Per-farm notification on/off preferences. A thin persistence layer over
 * `notification_preferences`, same shape as lib/data/farm-defaults.ts.
 */

interface NotificationPreferencesRow {
  farm_alerts_enabled: boolean;
  inventory_alerts_enabled: boolean;
}

const DEFAULT: NotificationPreferences = {
  farmAlertsEnabled: true,
  inventoryAlertsEnabled: true,
};

export const getNotificationPreferences = cache(async function getNotificationPreferences(
  farmId: string
): Promise<NotificationPreferences> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("farm_alerts_enabled, inventory_alerts_enabled")
    .eq("farm_id", farmId)
    .maybeSingle();

  if (error) {
    logger.error("notification preferences lookup failed", { reason: error.message });
    return DEFAULT;
  }
  if (!data) return DEFAULT;

  const row = data as NotificationPreferencesRow;
  return {
    farmAlertsEnabled: row.farm_alerts_enabled,
    inventoryAlertsEnabled: row.inventory_alerts_enabled,
  };
});

export async function saveNotificationPreferences(
  farmId: string,
  values: NotificationPreferences
): Promise<{ error: PostgrestError | null }> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("notification_preferences").upsert(
    {
      farm_id: farmId,
      farm_alerts_enabled: values.farmAlertsEnabled,
      inventory_alerts_enabled: values.inventoryAlertsEnabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "farm_id" }
  );

  return { error };
}
