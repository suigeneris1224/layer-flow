import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FlockStatus } from "@/lib/types/database";
import { logger } from "@/lib/observability/logger";

/**
 * Reading flocks.
 *
 * Onboarding writes exactly one flock and never reads it back; the dashboard
 * has its own narrow inline query. This is the general-purpose reader for the
 * management screen and for every action that needs a flock's current state.
 */

export interface FlockEntry {
  id: string;
  name: string;
  breed: string;
  houseId: string;
  houseName: string;
  initialHens: number;
  /** Trigger-managed from mortality_records -- never written directly. */
  currentHens: number;
  placementDate: string;
  startLayingDate: string | null;
  status: FlockStatus;
  notes: string;
}

interface FlockJoinRow {
  id: string;
  name: string;
  breed: string;
  house_id: string;
  initial_hens: number;
  current_hens: number;
  placement_date: string;
  start_laying_date: string | null;
  status: FlockStatus;
  notes: string | null;
  houses: { name: string } | { name: string }[] | null;
}

/** Postgrest returns a to-one join as an object or a single-element array. */
function one<T>(value: T | T[] | null): T | null {
  if (value === null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

const FLOCK_COLUMNS =
  "id, name, breed, house_id, initial_hens, current_hens, placement_date, " +
  "start_laying_date, status, notes, houses!inner(name)";

function toEntry(row: FlockJoinRow): FlockEntry {
  return {
    id: row.id,
    name: row.name,
    breed: row.breed,
    houseId: row.house_id,
    houseName: one(row.houses)?.name ?? "Unknown",
    initialHens: row.initial_hens,
    currentHens: row.current_hens,
    placementDate: row.placement_date,
    startLayingDate: row.start_laying_date,
    status: row.status,
    notes: row.notes ?? "",
  };
}

export async function getFlocks(farmId: string): Promise<FlockEntry[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("flocks")
    .select(FLOCK_COLUMNS)
    .eq("farm_id", farmId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("flock lookup failed", { reason: error.message });
    return [];
  }

  return ((data ?? []) as unknown as FlockJoinRow[]).map(toEntry);
}

export async function getFlock(farmId: string, flockId: string): Promise<FlockEntry | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("flocks")
    .select(FLOCK_COLUMNS)
    .eq("farm_id", farmId)
    .eq("id", flockId)
    .maybeSingle();

  if (error) {
    logger.error("flock detail lookup failed", { reason: error.message });
    return null;
  }
  if (!data) return null;

  return toEntry(data as unknown as FlockJoinRow);
}

/**
 * Only GROWING and PRODUCING count against the plan; a sold or closed flock
 * is history, not capacity in use. Centralises the filter onboarding's
 * `createFlockAction` inlines, so create/retire/display all agree.
 */
export async function getActiveFlockCount(farmId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();

  const { count, error } = await supabase
    .from("flocks")
    .select("id", { count: "exact", head: true })
    .eq("farm_id", farmId)
    .in("status", ["GROWING", "PRODUCING"]);

  if (error) {
    logger.error("active flock count failed", { reason: error.message });
    return Number.MAX_SAFE_INTEGER;
  }

  return count ?? 0;
}

export interface HouseOption {
  id: string;
  name: string;
}

export async function getHouseOptions(farmId: string): Promise<HouseOption[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("houses")
    .select("id, name")
    .eq("farm_id", farmId)
    .order("name");

  if (error) {
    logger.error("house options lookup failed", { reason: error.message });
    return [];
  }

  return data ?? [];
}
