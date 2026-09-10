import type { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";
import type { Json } from "@/lib/types/database";

/**
 * Brevo's transactional delivery webhook: no user session, so the shared
 * secret in the query string is the only gate -- Brevo's webhook UI has no
 * way to set a custom header, unlike the Vercel Cron Bearer token
 * (app/api/cron/subscription-emails/route.ts), so this can't use that
 * pattern. Set the webhook URL in Brevo's dashboard (Transactional →
 * Settings → Webhooks) to this route with `?secret=<BREVO_WEBHOOK_SECRET>`.
 *
 * Brevo can be configured to send either one event per request or a batch
 * array -- accept both rather than assuming.
 *
 * Never throws back a failure that would make Brevo retry indefinitely: an
 * unparseable payload or a partial insert failure is logged and still
 * answered 200, since there is nothing a retry would fix that a human
 * reading the log wouldn't do faster.
 */

interface BrevoEvent {
  event?: string;
  email?: string;
  subject?: string;
  tag?: string;
  tags?: string[];
  date?: string;
  ts_event?: number;
  "message-id"?: string;
  messageId?: string;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== serverEnv.brevoWebhookSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const events: BrevoEvent[] = Array.isArray(payload) ? payload : [payload as BrevoEvent];
  const rows = events
    .filter((event) => event && typeof event === "object" && event.email && event.event)
    .map((event) => ({
      message_id: event["message-id"] ?? event.messageId ?? null,
      recipient: event.email as string,
      event: event.event as string,
      subject: event.subject ?? null,
      tag: Array.isArray(event.tags) ? (event.tags[0] ?? null) : (event.tag ?? null),
      raw: event as unknown as Json,
      occurred_at: event.date
        ? new Date(event.date).toISOString()
        : event.ts_event
          ? new Date(event.ts_event * 1000).toISOString()
          : new Date().toISOString(),
    }));

  if (rows.length > 0) {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("email_events").insert(rows);
    if (error) {
      logger.error("brevo webhook insert failed", { reason: error.message });
    }
  }

  return new Response("ok", { status: 200 });
}
