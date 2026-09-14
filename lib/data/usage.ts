import "server-only";

import type { FarmContext } from "@/lib/auth/session";
import type { LimitKey } from "@/lib/subscriptions/plans";
import { getFarmCountForUser } from "@/lib/data/farms";
import { getHouseCount } from "@/lib/data/houses";
import { getActiveFlockCount } from "@/lib/data/flocks";
import { getCustomerCount } from "@/lib/data/customers";
import { getMemberCount, getPendingInvitationCount } from "@/lib/data/team";

/**
 * Current usage against each plan limit, for the Subscription page's "Current
 * Usage" panel -- see lib/subscriptions/plans.ts's PlanLimits/LIMIT_LABELS
 * and lib/subscriptions/entitlements.ts's getPlanLimit for the limit side.
 *
 * Every one of these counts already exists, queried inline at the matching
 * `assertCanCreate` call site right before a create action runs (farms in
 * app/(app)/farms/actions.ts, houses in app/(app)/houses/actions.ts, etc.).
 * This just runs the same five queries together, once, for display instead
 * of one at a time right before a write.
 */
export async function getUsageSummary(
  context: FarmContext
): Promise<Record<LimitKey, number>> {
  const [farms, houses, activeFlocks, customers, members, pendingInvitations] =
    await Promise.all([
      getFarmCountForUser(context.ownerId),
      getHouseCount(context.farmId),
      getActiveFlockCount(context.farmId),
      getCustomerCount(context.farmId),
      getMemberCount(context.farmId),
      getPendingInvitationCount(context.farmId),
    ]);

  return {
    farms,
    houses,
    active_flocks: activeFlocks,
    customers,
    // Matches team/actions.ts's own accounting: a pending invitation already
    // reserves a seat, so it counts against the same "users" limit a real
    // member does.
    users: members + pendingInvitations,
    history_days: 0,
  };
}
