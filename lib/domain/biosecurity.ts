/**
 * Biosecurity log helpers.
 *
 * Facts only: how long since a check was logged, how recently a visitor was
 * around other poultry. No disease risk scoring and no veterinary judgement --
 * same stance as lib/domain/alerts.ts. Pure module, ISO date strings.
 */

export const CHECK_TYPES = ["FOOTBATH", "DISINFECTION", "PEST_CONTROL", "CLEANING", "OTHER"] as const;

export type CheckType = (typeof CHECK_TYPES)[number];

export const CHECK_LABELS: Record<CheckType, string> = {
  FOOTBATH: "Footbath changed",
  DISINFECTION: "Disinfection",
  PEST_CONTROL: "Pest / rodent control",
  CLEANING: "House cleaning",
  OTHER: "Other",
};

/** Days a visitor's last poultry contact counts as "recent". */
export const RECENT_POULTRY_CONTACT_DAYS = 3;

function daysFrom(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000
  );
}

export interface LoggedCheck {
  checkType: CheckType;
  checkDate: string;
}

/**
 * Days since the most recent check of `type`, or null if the farm has never
 * logged one. Never negative (a future-dated row counts as today).
 */
export function daysSinceLastCheck(
  checks: readonly LoggedCheck[],
  type: CheckType,
  today: string
): number | null {
  let latest: string | null = null;
  for (const check of checks) {
    if (check.checkType !== type) continue;
    if (latest === null || check.checkDate > latest) latest = check.checkDate;
  }
  return latest === null ? null : Math.max(0, daysFrom(latest, today));
}

/**
 * Days between a visitor's last poultry contact and the visit, when that falls
 * within RECENT_POULTRY_CONTACT_DAYS. Null when unknown or not recent.
 */
export function recentPoultryContactDays(
  lastContactDate: string | null,
  visitDate: string
): number | null {
  if (!lastContactDate) return null;
  const gap = daysFrom(lastContactDate, visitDate);
  return gap >= 0 && gap <= RECENT_POULTRY_CONTACT_DAYS ? gap : null;
}
