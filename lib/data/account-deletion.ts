import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/observability/logger";
import type { AccountDeletionStatus } from "@/lib/types/database";

/**
 * Reads for account deletion requests (supabase/migrations/
 * 20250101003100_account_deletion_requests.sql).
 *
 * Mirrors lib/data/manual-payments.ts's split: `getAccountDeletionRequestForOwner`
 * goes through the ordinary RLS-scoped client (a farmer only ever sees their
 * own request anyway); `getPendingAccountDeletionRequests` is the app/admin/
 * equivalent -- service-role, since it looks across every account at once and
 * needs to compute each requester's owned-farm/team-member impact before an
 * admin approves.
 */

export interface AccountDeletionRequestRow {
  id: string;
  status: AccountDeletionStatus;
  reason: string | null;
  createdAt: string;
}

/** This account's own deletion request, if any -- for the Profile page's danger zone. */
export async function getAccountDeletionRequestForOwner(
  ownerId: string
): Promise<AccountDeletionRequestRow | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("account_deletion_requests")
    .select("id, status, reason, created_at")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error("account deletion request lookup failed", { reason: error.message });
    return null;
  }
  if (!data) return null;

  return {
    id: data.id,
    status: data.status,
    reason: data.reason,
    createdAt: data.created_at,
  };
}

export interface PendingAccountDeletionRequestRow {
  id: string;
  ownerId: string | null;
  email: string;
  reason: string | null;
  createdAt: string;
  /** What approving this would actually delete -- shown to the admin before they commit. */
  farmNames: string[];
  /** Other people (not the requester) who'd lose access when those farms go. */
  otherMemberCount: number;
}

/** Every PENDING account deletion request, oldest first -- for app/admin/'s review panel. */
export async function getPendingAccountDeletionRequests(): Promise<
  PendingAccountDeletionRequestRow[]
> {
  const admin = createSupabaseAdminClient();

  const { data: requests, error } = await admin
    .from("account_deletion_requests")
    .select("id, owner_id, email, reason, created_at")
    .eq("status", "PENDING")
    .order("created_at", { ascending: true });

  if (error) {
    logger.error("pending account deletion requests lookup failed", { reason: error.message });
    return [];
  }

  return Promise.all(
    (requests ?? []).map(async (request) => {
      if (!request.owner_id) {
        return {
          id: request.id,
          ownerId: null,
          email: request.email,
          reason: request.reason,
          createdAt: request.created_at,
          farmNames: [],
          otherMemberCount: 0,
        };
      }

      const { data: farms } = await admin
        .from("farms")
        .select("id, name")
        .eq("owner_id", request.owner_id);

      const farmIds = (farms ?? []).map((farm) => farm.id);
      let otherMemberCount = 0;

      if (farmIds.length > 0) {
        const { count } = await admin
          .from("farm_members")
          .select("id", { count: "exact", head: true })
          .in("farm_id", farmIds)
          .neq("user_id", request.owner_id);
        otherMemberCount = count ?? 0;
      }

      return {
        id: request.id,
        ownerId: request.owner_id,
        email: request.email,
        reason: request.reason,
        createdAt: request.created_at,
        farmNames: (farms ?? []).map((farm) => farm.name),
        otherMemberCount,
      };
    })
  );
}
