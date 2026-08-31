"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ACTIVE_FARM_COOKIE, getFarmContext, requireUser } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/auth/permissions";
import { assertCanAccess, assertCanCreate } from "@/lib/subscriptions/entitlements";
import { getMemberCount, getPendingInvitationCount } from "@/lib/data/team";
import { AUDIT_ACTIONS, recordAuditLog } from "@/lib/data/audit";
import {
  inviteMemberSchema,
  toFieldErrors,
  updateMemberRoleSchema,
} from "@/lib/validation/schemas";
import {
  describeDatabaseError,
  describeUnknownError,
  failure,
  type ActionResult,
} from "@/lib/errors";

/** How long a link stays good. Long enough to send and be read, not forever. */
const INVITE_DAYS = 7;

/**
 * Managing who can see a farm.
 *
 * Every action here is owner-only, which is not a choice this file makes:
 * farm_members_insert_owner / _update_owner / _delete_owner and the matching
 * farm_invitations policies already say so in the database. `canManageUsers`
 * exists so the UI can hide what a user cannot do and the action can fail with
 * a sentence instead of a raw policy violation.
 */

export async function inviteMemberAction(
  input: unknown
): Promise<ActionResult<{ token: string }>> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageUsers(context)) {
    return failure("Only the farm owner can invite people.");
  }

  const parsed = inviteMemberSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const entitlement = { plan: context.plan, status: context.subscriptionStatus };
    assertCanAccess(entitlement, "team_management");

    /*
     * Pending invitations count against the cap alongside existing members.
     * Nothing re-checks the plan when somebody accepts -- by then the token is
     * the authority -- so a farm could otherwise send ten invites on a two-user
     * plan and quietly end up with ten members.
     */
    const [members, pending] = await Promise.all([
      getMemberCount(context.farmId),
      getPendingInvitationCount(context.farmId),
    ]);
    assertCanCreate(entitlement, "users", members + pending);

    const supabase = await createSupabaseServerClient();
    const token = `${randomUUID()}${randomUUID()}`.replace(/-/g, "");
    const expiresAt = new Date(Date.now() + INVITE_DAYS * 86_400_000).toISOString();

    const { data, error } = await supabase
      .from("farm_invitations")
      .insert({
        farm_id: context.farmId,
        email: parsed.data.email,
        role: parsed.data.role,
        token,
        invited_by: user.id,
        expires_at: expiresAt,
      })
      .select("token")
      .single();

    if (error) return describeDatabaseError(error, "inviteMemberAction");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.MEMBER_ADDED,
      entityType: "farm_invitation",
      metadata: { email: parsed.data.email, role: parsed.data.role },
    });

    revalidatePath("/team");

    return { ok: true, data: { token: data.token } };
  } catch (error) {
    return describeUnknownError(error, "inviteMemberAction");
  }
}

export async function revokeInvitationAction(
  invitationId: string
): Promise<ActionResult> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageUsers(context)) {
    return failure("Only the farm owner can cancel an invitation.");
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("farm_invitations")
      .delete()
      .eq("id", invitationId)
      .eq("farm_id", context.farmId)
      .is("accepted_at", null)
      .select("email")
      .maybeSingle();

    if (error) return describeDatabaseError(error, "revokeInvitationAction");
    if (!data) return failure("That invitation is no longer open.");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.MEMBER_REMOVED,
      entityType: "farm_invitation",
      entityId: invitationId,
      metadata: { email: data.email, revoked: true },
    });

    revalidatePath("/team");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "revokeInvitationAction");
  }
}

export async function updateMemberRoleAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageUsers(context)) {
    return failure("Only the farm owner can change roles.");
  }

  const parsed = updateMemberRoleSchema.safeParse(input);
  if (!parsed.success) {
    return failure("Please check the form below.", toFieldErrors(parsed.error));
  }

  try {
    const supabase = await createSupabaseServerClient();

    /*
     * `neq("user_id", user.id)` is the owner guard. A farm must always keep an
     * owner, so the one person who cannot be demoted is the person doing the
     * demoting. The delete policy carries the same rule; update does not, so
     * it is enforced here.
     */
    const { data, error } = await supabase
      .from("farm_members")
      .update({ role: parsed.data.role })
      .eq("id", parsed.data.memberId)
      .eq("farm_id", context.farmId)
      .neq("user_id", user.id)
      .select("user_id")
      .maybeSingle();

    if (error) return describeDatabaseError(error, "updateMemberRoleAction");
    if (!data) return failure("That person is no longer on your team.");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.MEMBER_UPDATED,
      entityType: "farm_member",
      entityId: parsed.data.memberId,
      metadata: { role: parsed.data.role },
    });

    revalidatePath("/team");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "updateMemberRoleAction");
  }
}

export async function removeMemberAction(memberId: string): Promise<ActionResult> {
  const user = await requireUser();
  const context = await getFarmContext();

  if (!context) return failure("Set up your farm first.");
  if (!canManageUsers(context)) {
    return failure("Only the farm owner can remove people.");
  }

  try {
    const supabase = await createSupabaseServerClient();

    // farm_members_delete_owner already refuses `user_id = auth.uid()`; this
    // turns that refusal into a sentence rather than an empty result.
    const { data, error } = await supabase
      .from("farm_members")
      .delete()
      .eq("id", memberId)
      .eq("farm_id", context.farmId)
      .neq("user_id", user.id)
      .select("user_id")
      .maybeSingle();

    if (error) return describeDatabaseError(error, "removeMemberAction");
    if (!data) return failure("That person is no longer on your team.");

    await recordAuditLog({
      farmId: context.farmId,
      userId: user.id,
      action: AUDIT_ACTIONS.MEMBER_REMOVED,
      entityType: "farm_member",
      entityId: memberId,
      metadata: { userId: data.user_id },
    });

    revalidatePath("/team");

    return { ok: true };
  } catch (error) {
    return describeUnknownError(error, "removeMemberAction");
  }
}

/**
 * Redeem an invitation link.
 *
 * Not farm-scoped, and deliberately so: the person calling this has no farm
 * context yet -- that is the entire point of accepting. Like the profile
 * actions in app/(app)/settings/actions.ts it runs on the verified session
 * alone, and the token is what authorises it inside the RPC.
 */
export async function acceptInvitationAction(
  token: string
): Promise<ActionResult<{ farmId: string }>> {
  await requireUser();

  try {
    const supabase = await createSupabaseServerClient();
    const { data: farmId, error } = await supabase.rpc("accept_farm_invitation", {
      p_token: token,
    });

    if (error) return describeDatabaseError(error, "acceptInvitationAction");
    if (!farmId) return failure("That invitation is no longer valid.");

    // Land them on the farm they just joined rather than whichever farm the
    // cookie happened to hold.
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_FARM_COOKIE, farmId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    revalidatePath("/", "layout");

    return { ok: true, data: { farmId } };
  } catch (error) {
    return describeUnknownError(error, "acceptInvitationAction");
  }
}
