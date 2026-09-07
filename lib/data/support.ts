import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/observability/logger";

export interface MySupportRequestRow {
  id: string;
  subject: string;
  status: string;
  priority: boolean;
  createdAt: string;
}

interface MySupportRequestDbRow {
  id: string;
  subject: string;
  status: string;
  priority: boolean;
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

  return ((data ?? []) as MySupportRequestDbRow[]).map((row) => ({
    id: row.id,
    subject: row.subject,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at,
  }));
});
