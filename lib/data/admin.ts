import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AUDIT_ACTIONS } from "@/lib/data/audit";
import { logger } from "@/lib/observability/logger";
import type { BillingPeriod, SubscriptionPlan, SubscriptionStatus } from "@/lib/types/database";

/**
 * Cross-tenant reads for the platform-admin monitoring page
 * (app/admin/, gated by lib/auth/admin.ts).
 *
 * Every other lib/data/ module is farm-scoped by RLS. This one deliberately
 * is not -- it exists specifically to see every farm at once, which is why
 * it goes through the service-role client rather than the ordinary one.
 */

export interface AdminAccountRow {
  ownerId: string;
  ownerEmail: string | null;
  /** Every farm this account owns -- subscriptions are account-wide, not per farm. */
  farmNames: string[];
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billingPeriod: BillingPeriod;
  currentPeriodEnd: string | null;
  createdAt: string;
}

interface SubscriptionRow {
  owner_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billing_period: BillingPeriod;
  current_period_end: string | null;
  created_at: string;
}

function one<T>(value: T | T[] | null): T | null {
  if (value === null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Every account's subscription, soonest-expiring first (nulls -- no period
 * set yet -- last, since there's nothing to act on there).
 *
 * One row per owner, not per farm -- subscriptions are account-wide. Owner
 * emails come from one `listUsers()` call rather than one `getUserById()` per
 * row (the pattern lib/data/billing-contacts.ts uses for a single farm) --
 * fine for one account, wasteful for every account at once.
 */
export async function getAllSubscriptions(): Promise<AdminAccountRow[]> {
  const admin = createSupabaseAdminClient();

  const [subscriptionsResult, farmsResult, usersResult] = await Promise.all([
    admin
      .from("subscriptions")
      .select("owner_id, plan, status, billing_period, current_period_end, created_at"),
    admin.from("farms").select("owner_id, name").order("created_at", { ascending: true }),
    admin.auth.admin.listUsers(),
  ]);

  if (subscriptionsResult.error) {
    logger.error("admin subscriptions lookup failed", { reason: subscriptionsResult.error.message });
    return [];
  }
  if (farmsResult.error) {
    logger.error("admin farms lookup failed", { reason: farmsResult.error.message });
  }
  if (usersResult.error) {
    logger.error("admin user list lookup failed", { reason: usersResult.error.message });
  }

  // listUsers() paginates (default page size 50); a growing user base needs
  // this to walk every page, not just the first -- not worth solving before
  // LayerFlow actually has that many accounts.
  const emailById = new Map(usersResult.data?.users.map((u) => [u.id, u.email ?? null]) ?? []);

  const farmNamesByOwner = new Map<string, string[]>();
  for (const farm of farmsResult.data ?? []) {
    const names = farmNamesByOwner.get(farm.owner_id) ?? [];
    names.push(farm.name);
    farmNamesByOwner.set(farm.owner_id, names);
  }

  const rows = ((subscriptionsResult.data ?? []) as SubscriptionRow[]).map((row) => ({
    ownerId: row.owner_id,
    ownerEmail: emailById.get(row.owner_id) ?? null,
    farmNames: farmNamesByOwner.get(row.owner_id) ?? [],
    plan: row.plan,
    status: row.status,
    billingPeriod: row.billing_period,
    currentPeriodEnd: row.current_period_end,
    createdAt: row.created_at,
  }));

  return rows.sort((a, b) => {
    if (a.currentPeriodEnd === null) return 1;
    if (b.currentPeriodEnd === null) return -1;
    return a.currentPeriodEnd.localeCompare(b.currentPeriodEnd);
  });
}

export type EmailKind = "receipt" | "past_due_reminder" | "renewal_reminder";
export type EmailTrigger = "manual" | "cron";

export interface AdminEmailLogRow {
  id: string;
  farmId: string;
  farmName: string;
  kind: EmailKind | "unknown";
  to: "self" | "owner" | "unknown";
  trigger: EmailTrigger | "unknown";
  createdAt: string;
}

interface EmailAuditJoinRow {
  id: string;
  farm_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  farms: { name: string } | { name: string }[] | null;
}

/**
 * Every subscription email LayerFlow has sent, newest first -- every send
 * path (lib/email/client.ts's sendEmail, wherever it's called) already
 * writes one of these via recordAuditLog with
 * AUDIT_ACTIONS.SUBSCRIPTION_EMAIL_SENT, so this reads that trail rather
 * than needing a dedicated emails table.
 *
 * `limit` caps this at a flat number rather than real pagination -- fine
 * until a farm count exists that makes 200 rows too few to be useful; not
 * worth solving before that's true.
 */
export async function getEmailLog(limit = 200): Promise<AdminEmailLogRow[]> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("audit_logs")
    .select("id, farm_id, metadata, created_at, farms(name)")
    .eq("action", AUDIT_ACTIONS.SUBSCRIPTION_EMAIL_SENT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("admin email log lookup failed", { reason: error.message });
    return [];
  }

  return ((data ?? []) as unknown as EmailAuditJoinRow[]).map((row) => {
    const farm = one(row.farms);
    const metadata = row.metadata ?? {};
    return {
      id: row.id,
      farmId: row.farm_id ?? "",
      farmName: farm?.name ?? "Unknown farm",
      kind: (metadata.kind as EmailKind | undefined) ?? "unknown",
      to: (metadata.to as "self" | "owner" | undefined) ?? "unknown",
      trigger: (metadata.trigger as EmailTrigger | undefined) ?? "unknown",
      createdAt: row.created_at,
    };
  });
}

export interface BetaTesterRow {
  email: string;
  addedAt: string;
}

export interface BetaSettings {
  enabled: boolean;
  maxTesters: number;
  testers: BetaTesterRow[];
}

const DEFAULT_MAX_TESTERS = 5;

/** The beta-testing toggle, cap and tester list, for app/admin/beta-settings/. */
export async function getBetaSettings(): Promise<BetaSettings> {
  const admin = createSupabaseAdminClient();

  const [settingsResult, testersResult] = await Promise.all([
    admin.from("beta_settings").select("enabled, max_testers").eq("id", true).maybeSingle(),
    admin.from("beta_testers").select("email, added_at").order("added_at", { ascending: true }),
  ]);

  if (settingsResult.error) {
    logger.error("beta settings lookup failed", { reason: settingsResult.error.message });
  }
  if (testersResult.error) {
    logger.error("beta testers lookup failed", { reason: testersResult.error.message });
  }

  return {
    enabled: settingsResult.data?.enabled ?? false,
    maxTesters: settingsResult.data?.max_testers ?? DEFAULT_MAX_TESTERS,
    testers: (testersResult.data ?? []).map((row) => ({
      email: row.email,
      addedAt: row.added_at,
    })),
  };
}

/**
 * The lightweight version of getBetaSettings(), for the shared admin layout's
 * top-bar badge -- every admin page pays for this on every load, so it skips
 * the full tester list and just counts rows.
 */
export async function getBetaStatusSummary(): Promise<{ enabled: boolean; testerCount: number }> {
  const admin = createSupabaseAdminClient();

  const [settingsResult, countResult] = await Promise.all([
    admin.from("beta_settings").select("enabled").eq("id", true).maybeSingle(),
    admin.from("beta_testers").select("email", { count: "exact", head: true }),
  ]);

  if (settingsResult.error) {
    logger.error("beta status summary lookup failed", { reason: settingsResult.error.message });
  }

  return {
    enabled: settingsResult.data?.enabled ?? false,
    testerCount: countResult.count ?? 0,
  };
}

export interface SupportMessageRow {
  id: string;
  senderRole: "admin" | "farmer";
  senderEmail: string | null;
  body: string;
  createdAt: string;
}

export interface SupportRequestRow {
  id: string;
  farmName: string;
  submitterEmail: string | null;
  subject: string;
  message: string;
  priority: boolean;
  status: string;
  createdAt: string;
  messages: SupportMessageRow[];
}

interface SupportRequestJoinRow {
  id: string;
  farm_id: string;
  submitted_by: string;
  subject: string;
  message: string;
  priority: boolean;
  status: string;
  created_at: string;
  farms: { name: string } | { name: string }[] | null;
}

interface SupportMessageDbRow {
  id: string;
  request_id: string;
  sender_id: string;
  sender_role: "admin" | "farmer";
  body: string;
  created_at: string;
}

/**
 * Every request, open first (then priority, then newest) -- for app/admin/'s
 * support panel, which splits this into an open list and a collapsed
 * "Resolved" section itself. Capped at 100 rows so history doesn't grow
 * without bound; same "one listUsers() call, not one per row" shape as
 * getAllSubscriptions, since submitter email isn't stored on the row itself.
 * Each request's reply thread (support_request_messages) rides along in the
 * same round trip, since the admin panel always needs both together.
 */
export async function getSupportRequests(): Promise<SupportRequestRow[]> {
  const admin = createSupabaseAdminClient();

  const [requestsResult, usersResult] = await Promise.all([
    admin
      .from("support_requests")
      .select(
        "id, farm_id, submitted_by, subject, message, priority, status, created_at, farms!inner(name)"
      )
      .order("status", { ascending: true })
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
    admin.auth.admin.listUsers(),
  ]);

  if (requestsResult.error) {
    logger.error("support requests lookup failed", { reason: requestsResult.error.message });
    return [];
  }
  if (usersResult.error) {
    logger.error("admin user list lookup failed", { reason: usersResult.error.message });
  }

  const emailById = new Map(usersResult.data?.users.map((u) => [u.id, u.email ?? null]) ?? []);
  const requestRows = (requestsResult.data ?? []) as unknown as SupportRequestJoinRow[];

  const messagesByRequest = new Map<string, SupportMessageRow[]>();
  if (requestRows.length > 0) {
    const { data: messageRows, error: messagesError } = await admin
      .from("support_request_messages")
      .select("id, request_id, sender_id, sender_role, body, created_at")
      .in(
        "request_id",
        requestRows.map((row) => row.id)
      )
      .order("created_at", { ascending: true });

    if (messagesError) {
      logger.error("support message lookup failed", { reason: messagesError.message });
    } else {
      for (const row of (messageRows ?? []) as SupportMessageDbRow[]) {
        const list = messagesByRequest.get(row.request_id) ?? [];
        list.push({
          id: row.id,
          senderRole: row.sender_role,
          senderEmail: emailById.get(row.sender_id) ?? null,
          body: row.body,
          createdAt: row.created_at,
        });
        messagesByRequest.set(row.request_id, list);
      }
    }
  }

  return requestRows.map((row) => ({
    id: row.id,
    farmName: one(row.farms)?.name ?? "Unknown farm",
    submitterEmail: emailById.get(row.submitted_by) ?? null,
    subject: row.subject,
    message: row.message,
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at,
    messages: messagesByRequest.get(row.id) ?? [],
  }));
}
