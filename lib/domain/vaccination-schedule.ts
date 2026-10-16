/**
 * Vaccination schedule math.
 *
 * The programme is the farm's own -- typed in from whatever their vet gave
 * them. LayerFlow ships no preset and names no vaccine; this module only turns
 * "dose X at N days of age" into a date for each flock and says whether it has
 * been recorded. Same stance as lib/domain/alerts.ts.
 *
 * Pure module: no I/O, dates as ISO YYYY-MM-DD strings, so it is directly
 * testable.
 */

import { shiftDate } from "@/lib/format";

/** How far ahead a dose counts as "due soon". */
export const DUE_SOON_DAYS = 7;

export interface ScheduleItem {
  id: string;
  vaccineName: string;
  /** Bird age, in days, when this dose is given. */
  ageDays: number;
}

export interface ScheduleFlock {
  id: string;
  name: string;
  placementDate: string;
  /** Bird age when placed -- 0 for day-old chicks, ~112+ for ready-to-lay pullets. */
  ageAtPlacementDays: number;
}

/** A recorded vaccination, reduced to what the schedule needs. */
export interface RecordedDose {
  flockId: string;
  scheduleItemId: string | null;
  vaccinationDate: string;
}

export type DoseState = "done" | "overdue" | "due_soon" | "upcoming" | "skipped";

export interface DoseStatus {
  item: ScheduleItem;
  state: DoseState;
  /** The date the flock reaches this dose's age. */
  dueDate: string;
  /** Positive = days until due, negative = days overdue. */
  daysUntilDue: number;
  /** When the linked dose was recorded, for `done`. */
  doneDate: string | null;
}

function daysFrom(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

/** The flock's age in days on `today`. Never negative. */
export function flockAgeDays(flock: ScheduleFlock, today: string): number {
  return Math.max(0, flock.ageAtPlacementDays + daysFrom(flock.placementDate, today));
}

/** The date the flock reaches `ageDays`. */
export function dueDateFor(flock: ScheduleFlock, ageDays: number): string {
  return shiftDate(flock.placementDate, ageDays - flock.ageAtPlacementDays);
}

/**
 * Every scheduled dose for one flock, in age order.
 *
 * - `done`: a vaccination for this flock is linked to the item.
 * - `skipped`: the birds were already older than this dose's age when they
 *   arrived -- the hatchery or grower would have given it, not this farm, so
 *   it is never "overdue" here.
 * - `overdue` / `due_soon` / `upcoming` otherwise, by due date.
 */
export function scheduleStatus(
  flock: ScheduleFlock,
  items: readonly ScheduleItem[],
  doses: readonly RecordedDose[],
  today: string
): DoseStatus[] {
  const doneByItem = new Map<string, string>();
  for (const dose of doses) {
    if (dose.flockId !== flock.id || !dose.scheduleItemId) continue;
    const previous = doneByItem.get(dose.scheduleItemId);
    if (!previous || dose.vaccinationDate < previous) {
      doneByItem.set(dose.scheduleItemId, dose.vaccinationDate);
    }
  }

  return [...items]
    .sort((a, b) => a.ageDays - b.ageDays || a.vaccineName.localeCompare(b.vaccineName))
    .map((item) => {
      const dueDate = dueDateFor(flock, item.ageDays);
      const daysUntilDue = daysFrom(today, dueDate);
      const doneDate = doneByItem.get(item.id) ?? null;

      let state: DoseState;
      if (doneDate) state = "done";
      else if (item.ageDays < flock.ageAtPlacementDays) state = "skipped";
      else if (daysUntilDue < 0) state = "overdue";
      else if (daysUntilDue <= DUE_SOON_DAYS) state = "due_soon";
      else state = "upcoming";

      return { item, state, dueDate, daysUntilDue, doneDate };
    });
}

/** The doses worth showing a farmer today: everything not done or skipped. */
export function actionableDoses(statuses: readonly DoseStatus[]): DoseStatus[] {
  return statuses.filter((status) => status.state !== "done" && status.state !== "skipped");
}

/** Weeks + days, the way farmers count bird age: "18 wk", "3 wk 2 d", "5 d". */
export function formatAge(days: number): string {
  const weeks = Math.floor(days / 7);
  const rest = days % 7;
  if (weeks === 0) return `${rest} d`;
  return rest === 0 ? `${weeks} wk` : `${weeks} wk ${rest} d`;
}
