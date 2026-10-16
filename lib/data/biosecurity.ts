import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/observability/logger";
import { resolveRecordedByNames } from "@/lib/data/health";
import type { CheckType, LoggedCheck } from "@/lib/domain/biosecurity";

/** Reading the biosecurity logs. Facts only -- see lib/domain/biosecurity.ts. */

const RECENT_LIMIT = 20;

export interface VisitEntry {
  id: string;
  visitDate: string;
  visitorName: string;
  purpose: string;
  vehiclePlate: string;
  lastPoultryContactDate: string | null;
  disinfected: boolean;
  notes: string;
  recordedByName: string | null;
}

export async function getVisits(farmId: string, limit = RECENT_LIMIT): Promise<VisitEntry[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("biosecurity_visits")
    .select(
      "id, visit_date, visitor_name, purpose, vehicle_plate, last_poultry_contact_date, disinfected, notes, recorded_by"
    )
    .eq("farm_id", farmId)
    .order("visit_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("biosecurity visit lookup failed", { reason: error.message });
    return [];
  }

  const rows = data ?? [];
  const names = await resolveRecordedByNames(
    supabase,
    rows.map((row) => row.recorded_by)
  );

  return rows.map((row) => ({
    id: row.id,
    visitDate: row.visit_date,
    visitorName: row.visitor_name,
    purpose: row.purpose ?? "",
    vehiclePlate: row.vehicle_plate ?? "",
    lastPoultryContactDate: row.last_poultry_contact_date,
    disinfected: row.disinfected,
    notes: row.notes ?? "",
    recordedByName: row.recorded_by ? (names.get(row.recorded_by) ?? null) : null,
  }));
}

export interface CheckEntry {
  id: string;
  checkDate: string;
  checkType: CheckType;
  houseName: string | null;
  notes: string;
  recordedByName: string | null;
}

type CheckRow = {
  id: string;
  check_date: string;
  check_type: CheckType;
  notes: string | null;
  recorded_by: string | null;
  houses: { name: string } | { name: string }[] | null;
};

export async function getChecks(farmId: string, limit = RECENT_LIMIT): Promise<CheckEntry[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("biosecurity_checks")
    .select("id, check_date, check_type, notes, recorded_by, houses(name)")
    .eq("farm_id", farmId)
    .order("check_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("biosecurity check lookup failed", { reason: error.message });
    return [];
  }

  const rows = (data ?? []) as unknown as CheckRow[];
  const names = await resolveRecordedByNames(
    supabase,
    rows.map((row) => row.recorded_by)
  );

  return rows.map((row) => {
    const house = Array.isArray(row.houses) ? row.houses[0] : row.houses;
    return {
      id: row.id,
      checkDate: row.check_date,
      checkType: row.check_type,
      houseName: house?.name ?? null,
      notes: row.notes ?? "",
      recordedByName: row.recorded_by ? (names.get(row.recorded_by) ?? null) : null,
    };
  });
}

/**
 * The latest check of each type, for the alert rule and the "last done" tiles.
 * One row per type is all either needs, but a farm logs a handful a week, so
 * reading the last 90 days and reducing in memory is simpler than a view.
 */
export async function getLatestChecks(farmId: string, since: string): Promise<LoggedCheck[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("biosecurity_checks")
    .select("check_type, check_date")
    .eq("farm_id", farmId)
    .gte("check_date", since)
    .order("check_date", { ascending: false });

  if (error) {
    logger.error("latest biosecurity check lookup failed", { reason: error.message });
    return [];
  }

  const latest = new Map<CheckType, string>();
  for (const row of data ?? []) {
    if (!latest.has(row.check_type)) latest.set(row.check_type, row.check_date);
  }
  return [...latest.entries()].map(([checkType, checkDate]) => ({ checkType, checkDate }));
}
