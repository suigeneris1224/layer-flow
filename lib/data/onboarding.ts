import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OnboardingStep = "farm" | "house" | "flock" | "pricing" | "done";

export interface OnboardingState {
  step: OnboardingStep;
  farmId: string | null;
  farmName: string | null;
  houseCount: number;
  flockCount: number;
  hasPrices: boolean;
}

/**
 * Work out where the farmer is in setup by looking at what actually exists.
 *
 * Derived rather than stored, so refreshing, going back, or picking up on
 * another phone all land on the right step without a wizard cursor to keep in
 * sync.
 */
export async function getOnboardingState(userId: string): Promise<OnboardingState> {
  const supabase = await createSupabaseServerClient();

  const { data: membership } = await supabase
    .from("farm_members")
    .select("farm_id, farms!inner(id, name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const farm = membership?.farms as { id: string; name: string } | undefined;

  if (!farm) {
    return {
      step: "farm",
      farmId: null,
      farmName: null,
      houseCount: 0,
      flockCount: 0,
      hasPrices: false,
    };
  }

  // One round trip per count, run together -- head+count returns no rows.
  const [houses, flocks, prices] = await Promise.all([
    supabase
      .from("houses")
      .select("id", { count: "exact", head: true })
      .eq("farm_id", farm.id),
    supabase
      .from("flocks")
      .select("id", { count: "exact", head: true })
      .eq("farm_id", farm.id),
    supabase
      .from("egg_prices")
      .select("id", { count: "exact", head: true })
      .eq("farm_id", farm.id),
  ]);

  const houseCount = houses.count ?? 0;
  const flockCount = flocks.count ?? 0;
  const hasPrices = (prices.count ?? 0) > 0;

  const step: OnboardingStep =
    houseCount === 0 ? "house"
    : flockCount === 0 ? "flock"
    : !hasPrices ? "pricing"
    : "done";

  return {
    step,
    farmId: farm.id,
    farmName: farm.name,
    houseCount,
    flockCount,
    hasPrices,
  };
}
