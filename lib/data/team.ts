import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FarmRole } from "@/lib/types/database";
import { logger } from "@/lib/observability/logger";

/**
 * Reading the team.
 *
 * Members and pending invitations are two different shapes on purpose: a member
 * is a person with an account and a profile, an invitation is an email address
 * and nothing more. Merging them into one list would mean inventing a fake
 * profile for somebody who has not signed up.
 */

export interface TeamMember {
  id: string;
  userId: string;
  role: FarmRole;
  fullName: string;
  phone: string;
  avatarUrl: string | null;
  joinedAt: string;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: FarmRole;
  token: string;
  expiresAt: string;
  createdAt: string;
}

type MemberRow = {
  id: string;
  user_id: string;
  role: FarmRole;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
};

/**
 * Everyone with access to the farm.
 *
 * Profiles are fetched separately rather than embedded. `farm_members.user_id`
 * and `profiles.id` both reference `auth.users`, so they are siblings, not
 * parent and child -- PostgREST has no relationship to infer and an embed fails
 * with "Could not find a relationship". The alternative is a second foreign key
 * from farm_members straight to profiles, which would exist purely to satisfy
 * the query planner and would model a diamond that is not real.
 *
 * Two round trips for a list capped at ten people is the cheaper trade. RLS is
 * identical either way: profiles_select_self_or_teammate already lets people
 * who share a farm read each other.
 */
export async function getTeamMembers(farmId: string): Promise<TeamMember[]> {
  const supabase = await createSupabaseServerClient();

  const { data: memberRows, error } = await supabase
    .from("farm_members")
    .select("id, user_id, role, created_at")
    .eq("farm_id", farmId)
    .order("created_at", { ascending: true });

  if (error) {
    logger.error("team member lookup failed", { reason: error.message });
    return [];
  }

  const members = (memberRows ?? []) as MemberRow[];
  if (members.length === 0) return [];

  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, phone, avatar_url")
    .in("id", members.map((member) => member.user_id));

  if (profileError) {
    // A missing profile should not blank the team list -- names fall back.
    logger.error("team profile lookup failed", { reason: profileError.message });
  }

  const profiles = new Map(
    ((profileRows ?? []) as ProfileRow[]).map((profile) => [profile.id, profile])
  );

  const rank: Record<FarmRole, number> = { OWNER: 0, MANAGER: 1, WORKER: 2 };

  return members
    .map((member) => {
      const profile = profiles.get(member.user_id);
      return {
        id: member.id,
        userId: member.user_id,
        role: member.role,
        fullName: profile?.full_name?.trim() || "Unnamed",
        phone: profile?.phone ?? "",
        avatarUrl: profile?.avatar_url ?? null,
        joinedAt: member.created_at,
      };
    })
    .sort((a, b) => rank[a.role] - rank[b.role]);
}

/** Members on the farm, for the plan's `users` limit. */
export async function getMemberCount(farmId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();

  const { count, error } = await supabase
    .from("farm_members")
    .select("id", { count: "exact", head: true })
    .eq("farm_id", farmId);

  if (error) {
    logger.error("member count failed", { reason: error.message });
    // Fail closed against the limit, the same way getActiveFlockCount does.
    return Number.MAX_SAFE_INTEGER;
  }

  return count ?? 0;
}

/** Invitations still open: not accepted, not expired. */
export async function getPendingInvitations(
  farmId: string
): Promise<PendingInvitation[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("farm_invitations")
    .select("id, email, role, token, expires_at, created_at")
    .eq("farm_id", farmId)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("pending invitation lookup failed", { reason: error.message });
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    token: row.token,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }));
}

/**
 * Pending invitations count against the plan's user cap.
 *
 * Without this a farm on a 2-user plan could send ten invitations and end up
 * with ten members, because nothing re-checks the limit at the moment somebody
 * accepts -- by then the token is the authority, not the plan.
 */
export async function getPendingInvitationCount(farmId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();

  const { count, error } = await supabase
    .from("farm_invitations")
    .select("id", { count: "exact", head: true })
    .eq("farm_id", farmId)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString());

  if (error) {
    logger.error("pending invitation count failed", { reason: error.message });
    return Number.MAX_SAFE_INTEGER;
  }

  return count ?? 0;
}

export interface InvitationPreview {
  farmName: string;
  role: FarmRole;
  expiresAt: string;
}

/**
 * The outcome of looking a token up.
 *
 * "invalid" and "unavailable" are kept apart deliberately. Missing, expired and
 * already-accepted all collapse into `invalid`, because distinguishing them
 * would turn the link into a probe for live tokens. But a query that never ran
 * -- the database unreachable, the anon key misconfigured -- is not a statement
 * about the token at all, and telling somebody their invitation is invalid when
 * the truth is "we failed to check" sends them back to the farm owner for a new
 * link that will fail in exactly the same way.
 */
export type InvitationLookup =
  | { status: "ok"; preview: InvitationPreview }
  | { status: "invalid" }
  | { status: "unavailable" };

/**
 * What somebody holding a link is shown before they accept.
 *
 * Goes through the SECURITY DEFINER RPC because the caller is not a member and
 * has no read access to farm_invitations.
 */
export async function getInvitationPreview(token: string): Promise<InvitationLookup> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("invitation_preview", { p_token: token });

  if (error) {
    logger.error("invitation preview failed", { reason: error.message });
    return { status: "unavailable" };
  }

  const row = (data ?? [])[0];
  if (!row) return { status: "invalid" };

  return {
    status: "ok",
    preview: { farmName: row.farm_name, role: row.role, expiresAt: row.expires_at },
  };
}
