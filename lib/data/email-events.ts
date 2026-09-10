import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/observability/logger";

/**
 * Reads for Brevo delivery-webhook events (supabase/migrations/
 * 20250101002700_email_events.sql, written by app/api/webhooks/brevo/route.ts).
 *
 * Service-role, like every other cross-tenant admin read in lib/data/admin.ts
 * -- this table has no policy for `authenticated` at all.
 */

export interface EmailEventRow {
  id: string;
  messageId: string | null;
  recipient: string;
  event: string;
  subject: string | null;
  tag: string | null;
  occurredAt: string;
}

interface EmailEventDbRow {
  id: string;
  message_id: string | null;
  recipient: string;
  event: string;
  subject: string | null;
  tag: string | null;
  occurred_at: string;
}

/** Most recent delivery-webhook events, newest first -- for app/admin/email-logs/. */
export async function getRecentEmailEvents(limit = 200): Promise<EmailEventRow[]> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("email_events")
    .select("id, message_id, recipient, event, subject, tag, occurred_at")
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("email events lookup failed", { reason: error.message });
    return [];
  }

  return ((data ?? []) as EmailEventDbRow[]).map((row) => ({
    id: row.id,
    messageId: row.message_id,
    recipient: row.recipient,
    event: row.event,
    subject: row.subject,
    tag: row.tag,
    occurredAt: row.occurred_at,
  }));
}
