import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/observability/logger";

export interface SupportMessage {
  id: string;
  senderRole: "admin" | "farmer";
  isSelf: boolean;
  body: string;
  createdAt: string;
}

export interface MySupportRequestRow {
  id: string;
  subject: string;
  status: string;
  priority: boolean;
  createdAt: string;
  messages: SupportMessage[];
}

interface MySupportRequestDbRow {
  id: string;
  subject: string;
  status: string;
  priority: boolean;
  created_at: string;
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
 * A user's own submitted support requests, newest first -- for the tracker
 * beside the form on app/(app)/support/page.tsx. Scoped to submitted_by on
 * top of the support_requests_select RLS policy, which itself already lets
 * any farm member read every request on the farm.
 */
export const getMySupportRequests = cache(async function getMySupportRequests(
  farmId: string,
  userId: string
): Promise<MySupportRequestRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("support_requests")
    .select("id, subject, status, priority, created_at")
    .eq("farm_id", farmId)
    .eq("submitted_by", userId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("my support requests lookup failed", { reason: error.message });
    return [];
  }

  const requestRows = (data ?? []) as MySupportRequestDbRow[];
  const messagesByRequest = new Map<string, SupportMessage[]>();

  if (requestRows.length > 0) {
    const { data: messageRows, error: messagesError } = await supabase
      .from("support_request_messages")
      .select("id, request_id, sender_id, sender_role, body, created_at")
      .in(
        "request_id",
        requestRows.map((row) => row.id)
      )
      .order("created_at", { ascending: true });

    if (messagesError) {
      logger.error("my support message lookup failed", { reason: messagesError.message });
    } else {
      for (const row of (messageRows ?? []) as SupportMessageDbRow[]) {
        const list = messagesByRequest.get(row.request_id) ?? [];
        list.push({
          id: row.id,
          senderRole: row.sender_role,
          isSelf: row.sender_id === userId,
          body: row.body,
          createdAt: row.created_at,
        });
        messagesByRequest.set(row.request_id, list);
      }
    }
  }

  return requestRows.map((row) => ({
    id: row.id,
    subject: row.subject,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at,
    messages: messagesByRequest.get(row.id) ?? [],
  }));
});
