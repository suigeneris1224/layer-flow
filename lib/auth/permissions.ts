import type { FarmRole } from "@/lib/types/database";
import type { FarmContext } from "@/lib/auth/session";

/**
 * Role capabilities.
 *
 * This mirrors the RLS policies in 20250101000400_rls.sql. The database is
 * the enforcement point; these functions exist so the UI can hide what a user
 * cannot do, and so server actions can fail fast with a friendly message
 * instead of a raw policy violation.
 *
 * If you change a rule here, change the matching policy too. They must agree.
 */

const RANK: Record<FarmRole, number> = {
  WORKER: 1,
  MANAGER: 2,
  OWNER: 3,
};

function atLeast(role: FarmRole, minimum: FarmRole): boolean {
  return RANK[role] >= RANK[minimum];
}

/** Membership in the farm at all -- read access. */
export function canAccessFarm(context: FarmContext | null): boolean {
  return context !== null;
}

/** Daily operations: any member, including workers. */
export function canRecordProduction(context: FarmContext | null): boolean {
  return context !== null;
}

export function canRecordFeed(context: FarmContext | null): boolean {
  return context !== null;
}

export function canRecordMortality(context: FarmContext | null): boolean {
  return context !== null;
}

/**
 * Vaccinations follow the same rule as the rest of daily operations.
 *
 * `vaccinations_write` in 20250101000400_rls.sql uses app.is_farm_member, not
 * app.can_manage_farm -- the worker holding the syringe is the one who knows
 * it happened, so making them fetch a manager to log it would just mean it
 * never gets logged.
 */
export function canRecordVaccination(context: FarmContext | null): boolean {
  return context !== null;
}

/** Farm setup: houses, flocks, egg sizes, pricing. */
export function canManageFlock(context: FarmContext | null): boolean {
  return context !== null && atLeast(context.role, "MANAGER");
}

/** Houses share the flock write policy exactly (`houses_write` == `flocks_write`). */
export const canManageHouse = canManageFlock;

export function canManageEggSizes(context: FarmContext | null): boolean {
  return context !== null && atLeast(context.role, "MANAGER");
}

export function canManagePricing(context: FarmContext | null): boolean {
  return context !== null && atLeast(context.role, "MANAGER");
}

/** Commerce. */
export function canManageSales(context: FarmContext | null): boolean {
  return context !== null && atLeast(context.role, "MANAGER");
}

export function canManageExpenses(context: FarmContext | null): boolean {
  return context !== null && atLeast(context.role, "MANAGER");
}

export function canManageCustomers(context: FarmContext | null): boolean {
  return context !== null && atLeast(context.role, "MANAGER");
}

export function canAdjustInventory(context: FarmContext | null): boolean {
  return context !== null && atLeast(context.role, "MANAGER");
}

/** Owner-only. */
export function canManageUsers(context: FarmContext | null): boolean {
  return context !== null && atLeast(context.role, "OWNER");
}

export function canManageBilling(context: FarmContext | null): boolean {
  return context !== null && atLeast(context.role, "OWNER");
}

export function canManageFarmSettings(context: FarmContext | null): boolean {
  return context !== null && atLeast(context.role, "OWNER");
}

export const ROLE_LABELS: Record<FarmRole, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  WORKER: "Worker",
};

export const ROLE_DESCRIPTIONS: Record<FarmRole, string> = {
  OWNER: "Full access, including team members and billing.",
  MANAGER: "Runs the farm day to day: flocks, sales, expenses and pricing.",
  WORKER: "Records daily production, feed and mortality.",
};
