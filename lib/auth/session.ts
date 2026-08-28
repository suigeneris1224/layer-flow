import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FarmRole, SubscriptionPlan, SubscriptionStatus } from "@/lib/types/database";

export const ACTIVE_FARM_COOKIE = "lf_active_farm";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
}

export interface FarmContext {
  farmId: string;
  farmName: string;
  currency: string;
  timezone: string;
  role: FarmRole;
  plan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
}

/**
 * The authenticated user, or null.
 *
 * `getUser()` verifies the JWT with Supabase on every call rather than
 * trusting the cookie's claims. Wrapped in React `cache` so a single render
 * pass makes one round trip no matter how many components ask.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    id: user.id,
    email: user.email ?? "",
    fullName: (user.user_metadata?.full_name as string | undefined) ?? "",
  };
});

/** Same, but redirects to login instead of returning null. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Every farm the user belongs to, with their role in each.
 */
export const getUserFarms = cache(async () => {
  const user = await getSessionUser();
  if (!user) return [];

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("farm_members")
    .select("role, farms!inner(id, name, currency, timezone)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  type Joined = { role: FarmRole; farms: { id: string; name: string; currency: string; timezone: string } };

  return ((data ?? []) as unknown as Joined[]).map((row) => ({
    farmId: row.farms.id,
    farmName: row.farms.name,
    currency: row.farms.currency,
    timezone: row.farms.timezone,
    role: row.role,
  }));
});

/**
 * The farm the user is currently working in.
 *
 * Resolution order: the active-farm cookie, then their first membership. The
 * cookie is only ever used to *select among farms they already belong to* --
 * a tampered value falls through to the default rather than granting access.
 */
export const getFarmContext = cache(async (): Promise<FarmContext | null> => {
  const farms = await getUserFarms();
  if (farms.length === 0) return null;

  const cookieStore = await cookies();
  const requested = cookieStore.get(ACTIVE_FARM_COOKIE)?.value;
  const selected = farms.find((f) => f.farmId === requested) ?? farms[0];

  const supabase = await createSupabaseServerClient();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("farm_id", selected.farmId)
    .maybeSingle();

  return {
    ...selected,
    plan: subscription?.plan ?? "FREE",
    subscriptionStatus: subscription?.status ?? "ACTIVE",
  };
});

/**
 * Farm context or bust. Sends users with no farm yet into onboarding.
 */
export async function requireFarmContext(): Promise<FarmContext> {
  await requireUser();
  const context = await getFarmContext();
  if (!context) redirect("/onboarding");
  return context;
}
