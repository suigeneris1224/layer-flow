import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/observability/logger";
import {
  actionableDoses,
  scheduleStatus,
  type DoseStatus,
  type RecordedDose,
  type ScheduleFlock,
  type ScheduleItem,
} from "@/lib/domain/vaccination-schedule";

/**
 * Reading the farm's vaccination programme, and which doses each flock has
 * due. The math lives in lib/domain/vaccination-schedule.ts; this module only
 * fetches.
 */

export interface ScheduleItemEntry extends ScheduleItem {
  notes: string;
}

export async function getScheduleItems(farmId: string): Promise<ScheduleItemEntry[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("vaccination_schedule_items")
    .select("id, vaccine_name, age_days, notes")
    .eq("farm_id", farmId)
    .order("age_days")
    .order("vaccine_name");

  if (error) {
    logger.error("vaccination schedule lookup failed", { reason: error.message });
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    vaccineName: row.vaccine_name,
    ageDays: row.age_days,
    notes: row.notes ?? "",
  }));
}

/** Only vaccinations linked to a schedule item -- the rest can't mark a dose done. */
async function getScheduledDoses(farmId: string): Promise<RecordedDose[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("vaccinations")
    .select("flock_id, schedule_item_id, vaccination_date")
    .eq("farm_id", farmId)
    .not("schedule_item_id", "is", null);

  if (error) {
    logger.error("scheduled dose lookup failed", { reason: error.message });
    return [];
  }

  return (data ?? []).map((row) => ({
    flockId: row.flock_id,
    scheduleItemId: row.schedule_item_id,
    vaccinationDate: row.vaccination_date,
  }));
}

export interface FlockDoses {
  flock: ScheduleFlock;
  statuses: DoseStatus[];
}

/**
 * Every active flock's schedule, given flocks the caller already loaded.
 * Empty when the farm has no programme -- callers treat that as "fall back to
 * the generic vaccination gap alert".
 */
export async function getFlockDoses(
  farmId: string,
  flocks: readonly ScheduleFlock[],
  today: string
): Promise<{ items: ScheduleItemEntry[]; byFlock: FlockDoses[] }> {
  const [items, doses] = await Promise.all([getScheduleItems(farmId), getScheduledDoses(farmId)]);
  if (items.length === 0) return { items, byFlock: [] };

  return {
    items,
    byFlock: flocks.map((flock) => ({
      flock,
      statuses: scheduleStatus(flock, items, doses, today),
    })),
  };
}

/** Flattened for the alert rule: every overdue or due-soon dose across flocks. */
export function dueDosesForAlert(byFlock: readonly FlockDoses[]) {
  return byFlock.flatMap(({ flock, statuses }) =>
    actionableDoses(statuses)
      .filter((status) => status.state !== "upcoming")
      .map((status) => ({
        flockName: flock.name,
        vaccineName: status.item.vaccineName,
        daysUntilDue: status.daysUntilDue,
      }))
  );
}
