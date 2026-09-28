import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasBetaProAccess } from "@/lib/subscriptions/beta";
import type { FarmRole, SubscriptionPlan, SubscriptionStatus } from "@/lib/types/database";

export const ACTIVE_FARM_COOKIE = "lf_active_farm";

/**
 * Sticky "I was mid-invite" marker, set whenever the submitted `next` points
 * at an invite, checked by requireFarmContext before it would otherwise send
 * a farm-less user to onboarding. Exists because `next` alone doesn't survive
 * every path (a failed confirmation link, or closing the tab) -- without it
 * an invited worker/manager could end up creating their own farm instead of
 * joining the one they were invited to. maxAge tracks the invite's own 7-day
 * expiry plus a day.
 */
export const PENDING_INVITE_COOKIE = "lf_pending_invite";
const PENDING_INVITE_MAX_AGE = 60 * 60 * 24 * 8;

/** Matches the 64 lowercase-hex-char tokens inviteMemberAction (app/(app)/settings/team/actions.ts) generates -- two UUIDs concatenated with the dashes stripped. */
const INVITE_TOKEN_PATTERN = /^[0-9a-f]{64}$/i;

/** Pulls a farm_invitations token out of a path like "/invite/<token>", or null if it isn't one. */
export function inviteTokenFromPath(path: string): string | null {
  const match = /^\/invite\/([^/?#]+)$/.exec(path);
  if (!match) return null;
  return INVITE_TOKEN_PATTERN.test(match[1]) ? match[1] : null;
}

/** Reads PENDING_INVITE_COOKIE and returns the `/invite/<token>` path to send a farm-less user to, or null. */
export async function pendingInviteRedirectTarget(): Promise<`/invite/${string}` | null> {
  const token = (await cookies()).get(PENDING_INVITE_COOKIE)?.value;
  return token && INVITE_TOKEN_PATTERN.test(token) ? `/invite/${token}` : null;
}

/** Stash `next` as the pending invite if it points at one -- call from a Server Action, not a Server Component. */
export async function rememberPendingInviteIfAny(next: string): Promise<void> {
  const token = inviteTokenFromPath(next);
  if (!token) return;

  const cookieStore = await cookies();
  cookieStore.set(PENDING_INVITE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PENDING_INVITE_MAX_AGE,
  });
}

/** Clears the pending-invite marker once it's been acted on (accepted, or deliberately skipped). */
export async function clearPendingInvite(): Promise<void> {
  (await cookies()).delete(PENDING_INVITE_COOKIE);
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
}

export interface FarmContext {
  farmId: string;
  farmName: string;
  /** The account this farm belongs to -- subscriptions.owner_id, not farm_id: plan is account-wide. */
  ownerId: string;
  currency: string;
  timezone: string;
  role: FarmRole;
  plan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  /**
   * True when `plan`/`subscriptionStatus` above come from the beta-testing
   * override (lib/subscriptions/beta.ts), not a real subscription -- lets
   * billing/renewal UI avoid presenting complimentary access as a paid plan.
   */
  isBetaOverride: boolean;
}

/**
 * The authenticated user, or null. Wrapped in React `cache` so one render
 * pass makes one round trip. Prefers the `x-lf-user` header middleware
 * already set from its own `getUser()` call this request, falling back to a
 * fresh `getUser()` if that header is missing or unparseable -- degrades to
 * slower-but-correct, never a wrong user.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const forwarded = (await headers()).get("x-lf-user");
  if (forwarded) {
    try {
      const parsed = JSON.parse(forwarded) as SessionUser;
      if (parsed.id && typeof parsed.id === "string") return parsed;
    } catch {
      // Fall through to the real check below.
    }
  }

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
    .select("role, farms!inner(id, name, currency, timezone, owner_id)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  type Joined = {
    role: FarmRole;
    farms: { id: string; name: string; currency: string; timezone: string; owner_id: string };
  };

  return ((data ?? []) as unknown as Joined[]).map((row) => ({
    farmId: row.farms.id,
    farmName: row.farms.name,
    ownerId: row.farms.owner_id,
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
    .eq("owner_id", selected.ownerId)
    .maybeSingle();

  let plan: SubscriptionPlan = subscription?.plan ?? "FREE";
  let subscriptionStatus: SubscriptionStatus = subscription?.status ?? "ACTIVE";
  let isBetaOverride = false;

  // Beta testing gives the OWNER of their own farm full Pro access with no
  // real subscription -- restricted to owned farms so it can never boost a
  // farm the tester merely belongs to (see lib/subscriptions/beta.ts).
  if (selected.role === "OWNER") {
    const user = await getSessionUser();
    if (user && (await hasBetaProAccess(user.email))) {
      plan = "PRO";
      subscriptionStatus = "ACTIVE";
      isBetaOverride = true;
    }
  }

  return {
    ...selected,
    plan,
    subscriptionStatus,
    isBetaOverride,
  };
});

/**
 * Farm context or bust. Sends users with no farm yet into onboarding --
 * unless they're mid-invite (see PENDING_INVITE_COOKIE above), in which case
 * they're sent back to accept it instead of walking into onboarding and
 * creating a farm of their own.
 */
export async function requireFarmContext(): Promise<FarmContext> {
  await requireUser();
  const context = await getFarmContext();
  if (!context) {
    const pendingInvite = await pendingInviteRedirectTarget();
    if (pendingInvite) redirect(pendingInvite);
    redirect("/onboarding");
  }
  return context;
}
