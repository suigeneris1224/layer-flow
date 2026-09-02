import type { Metadata } from "next";
import { Users } from "lucide-react";
import { requireFarmContext, requireUser } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/auth/permissions";
import {
  canAccess,
  canCreate,
  featureLockedPrompt,
  limitReachedPrompt,
} from "@/lib/subscriptions/entitlements";
import { getPendingInvitations, getTeamMembers } from "@/lib/data/team";
import { publicEnv } from "@/lib/config/env";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { StatusNote } from "@/components/ui/states";
import { UpgradePanel } from "@/components/subscriptions/upgrade-panel";
import { TeamManager } from "./team-manager";

export const metadata: Metadata = { title: "Team" };

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const user = await requireUser();
  const context = await requireFarmContext();
  const entitlement = { plan: context.plan, status: context.subscriptionStatus };

  if (!canAccess(entitlement, "team_management")) {
    return (
      <PageShell width="reading">
        <PageHeader
          title="Team"
          description="Let other people record on this farm."
        />
        <UpgradePanel prompt={featureLockedPrompt(entitlement, "team_management")} />
      </PageShell>
    );
  }

  const [members, invitations] = await Promise.all([
    getTeamMembers(context.farmId),
    getPendingInvitations(context.farmId),
  ]);

  const canManage = canManageUsers(context);

  // Pending invitations occupy a seat: each one becomes a member the moment it
  // is opened, and nothing re-checks the plan at that point.
  const used = members.length + invitations.length;
  const canInvite = canCreate(entitlement, "users", used);

  return (
    <PageShell>
      <PageHeader
        title="Team"
        description="Let other people record on this farm."
      />

      {!canManage && (
        <StatusNote tone="info" title="Read only">
          Only the farm owner can invite people or change roles.
        </StatusNote>
      )}

      <TeamManager
        members={members}
        invitations={invitations}
        currentUserId={user.id}
        canManage={canManage}
        canInvite={canInvite}
        appUrl={publicEnv.appUrl}
        timezone={context.timezone}
      />

      {canManage && !canInvite && (
        <UpgradePanel prompt={limitReachedPrompt(entitlement, "users", used)} />
      )}

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Users className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          Removing someone takes away their access to this farm. The records they
          entered stay — they belong to the farm, not the person.
        </span>
      </p>
    </PageShell>
  );
}
