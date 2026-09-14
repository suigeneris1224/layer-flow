import type { Alert, AlertType } from "@/lib/domain/alerts";

/**
 * Which of lib/domain/alerts.ts's 9 AlertTypes each Settings -> Notifications
 * switch covers. Grouped into the same two categories the settings page has
 * always shown, rather than one switch per rule.
 */
export const FARM_PRODUCTION_TYPES: readonly AlertType[] = [
  "production",
  "feed_cost",
  "mortality",
  "egg_size",
  "vaccination",
  "underperforming_flock",
  "flock_loss",
];

export const INVENTORY_TYPES: readonly AlertType[] = ["low_inventory", "stale_pricing"];

export interface NotificationPreferences {
  farmAlertsEnabled: boolean;
  inventoryAlertsEnabled: boolean;
}

/**
 * Alerts allowed to become/stay a `notifications` row. A disabled category is
 * filtered out here, before syncNotifications' resolve/insert/update diff
 * runs against it -- so an already-open notification for a type that just got
 * disabled is resolved the same way it would be if the underlying condition
 * had cleared.
 *
 * Deliberately not applied to DashboardData.alerts itself: the dashboard's
 * own live status (TodayStatus) always shows real conditions, so muting a
 * notification category can never hide a real problem from the person
 * actually looking at the dashboard right now.
 */
export function filterAlertsForNotifications(
  alerts: readonly Alert[],
  prefs: NotificationPreferences
): Alert[] {
  return alerts.filter((alert) => {
    if (!alert.type) return true;
    if (!prefs.farmAlertsEnabled && FARM_PRODUCTION_TYPES.includes(alert.type)) return false;
    if (!prefs.inventoryAlertsEnabled && INVENTORY_TYPES.includes(alert.type)) return false;
    return true;
  });
}
