import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FarmContext } from "@/lib/auth/session";
import type { Alert, AlertLevel, AlertType } from "@/lib/domain/alerts";
import { logger } from "@/lib/observability/logger";

/**
 * Notifications persisted from the dashboard's own alert rules.
 *
 * Deliberately not a second alerting system: every row here traces back to
 * one of the deterministic rules in lib/domain/alerts.ts. One open (not yet
 * resolved) notification exists per farm per alert type -- see
 * notifications_open_key in the migration -- so a condition that keeps firing
 * does not spam a new row every time the dashboard renders, and read state is
 * shared across the whole farm rather than tracked per teammate, matching how
 * the alert badge already had no notion of "per user."
 */

export interface Notification {
  id: string;
  type: AlertType;
  level: AlertLevel;
  message: string;
  createdAt: string;
  readAt: string | null;
  resolvedAt: string | null;
}

interface NotificationRow {
  id: string;
  type: string;
  level: string;
  message: string;
  created_at: string;
  read_at: string | null;
  resolved_at: string | null;
}

function fromRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    type: row.type as AlertType,
    level: row.level as AlertLevel,
    message: row.message,
    createdAt: row.created_at,
    readAt: row.read_at,
    resolvedAt: row.resolved_at,
  };
}

const HISTORY_DAYS = 30;

/**
 * Recent notifications for the farm, newest first: open ones plus anything
 * resolved in the last 30 days, so the panel has some history without
 * growing without bound.
 */
export const getNotifications = cache(async function getNotifications(
  context: FarmContext
): Promise<Notification[]> {
  const supabase = await createSupabaseServerClient();
  const since = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, level, message, created_at, read_at, resolved_at")
    .eq("farm_id", context.farmId)
    .or(`resolved_at.is.null,created_at.gte.${since}`)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("notification list failed", { reason: error.message });
    return [];
  }

  return ((data ?? []) as NotificationRow[]).map(fromRow);
});

/** For the topbar badge: firing and not yet acknowledged by anyone on the farm. */
export const getUnreadNotificationCount = cache(async function getUnreadNotificationCount(
  context: FarmContext
): Promise<number> {
  const supabase = await createSupabaseServerClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("farm_id", context.farmId)
    .is("resolved_at", null)
    .is("read_at", null);

  if (error) {
    logger.error("notification count failed", { reason: error.message });
    return 0;
  }

  return count ?? 0;
});

/**
 * Reconcile stored notifications with the alerts firing right now.
 *
 * Alerts without a `type` (the synthetic "Production is normal" placeholder)
 * are ignored -- there is nothing to persist when nothing is wrong. A type
 * missing from `alerts` that has an open row gets resolved; a type present
 * that has no open row gets created; a type present whose open row already
 * matches is left untouched so `created_at` keeps pointing at when the
 * condition first started, not when it was last observed.
 */
export async function syncNotifications(context: FarmContext, alerts: readonly Alert[]): Promise<void> {
  const firing = new Map<AlertType, Alert>();
  for (const alert of alerts) {
    if (alert.level === "good" || !alert.type) continue;
    firing.set(alert.type, alert);
  }

  const supabase = await createSupabaseServerClient();

  const { data: openRows, error: readError } = await supabase
    .from("notifications")
    .select("id, type, level, message")
    .eq("farm_id", context.farmId)
    .is("resolved_at", null);

  if (readError) {
    logger.error("notification sync read failed", { reason: readError.message });
    return;
  }

  const open = (openRows ?? []) as { id: string; type: string; level: string; message: string }[];
  const openByType = new Map(open.map((row) => [row.type as AlertType, row]));

  const toResolve = open.filter((row) => !firing.has(row.type as AlertType)).map((row) => row.id);
  const toInsert = [...firing.entries()].filter(([type]) => !openByType.has(type));
  const toUpdate = [...firing.entries()].filter(([type, alert]) => {
    const existing = openByType.get(type);
    return existing && (existing.level !== alert.level || existing.message !== alert.message);
  });

  const now = new Date().toISOString();

  await Promise.all([
    toResolve.length > 0
      ? supabase.from("notifications").update({ resolved_at: now }).in("id", toResolve)
      : null,
    toInsert.length > 0
      ? supabase.from("notifications").insert(
          toInsert.map(([type, alert]) => ({
            farm_id: context.farmId,
            type,
            level: alert.level,
            message: alert.message,
          }))
        )
      : null,
    ...toUpdate.map(([type, alert]) =>
      supabase
        .from("notifications")
        .update({ level: alert.level, message: alert.message })
        .eq("id", openByType.get(type)!.id)
    ),
  ]);
}
