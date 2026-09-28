import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/observability/logger";
import type { Database } from "@/lib/types/database";

/**
 * Beta testing phase (app/admin/'s beta panel): a global toggle plus up to 5
 * testers, by email, who get full Pro-tier access on their own farms without
 * a real subscription -- see lib/auth/session.ts's getFarmContext() for the
 * entitlement override, and app/auth/actions.ts's signUpAction for the
 * closed-beta signup gate that reuses the same list.
 *
 * Each function takes an optional `client`, defaulting to a cross-request
 * cache (`getBetaState` below) rather than the ordinary request-scoped
 * client -- signUpAction passes the admin client explicitly instead, since
 * there is no session yet for RLS to key off of before an account exists.
 */

const DEFAULT_MAX_TESTERS = 5;
export const BETA_SETTINGS_TAG = "beta-settings";

export interface BetaTesterRow {
  email: string;
  addedAt: string;
}

export interface BetaState {
  enabled: boolean;
  maxTesters: number;
  testers: BetaTesterRow[];
}

/**
 * Cross-request cache of the beta state: the toggle, tester cap, and tester
 * list. Small, global data invalidated by `revalidateTag(BETA_SETTINGS_TAG)`
 * on every beta-mutation action, so reading it on essentially every request
 * (via getFarmContext) is otherwise pure waste.
 *
 * Uses the service-role client since `unstable_cache` can't depend on
 * request-scoped cookies -- safe here since the data has no per-user
 * variation and nothing sensitive.
 */
const getBetaState = unstable_cache(
  async (): Promise<BetaState> => {
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
  },
  ["beta-state"],
  { tags: [BETA_SETTINGS_TAG] }
);

/** For lib/data/admin.ts's admin-panel reads, which need the full state, not just the two booleans below. */
export { getBetaState };

export async function isBetaModeEnabled(client?: SupabaseClient<Database>): Promise<boolean> {
  if (client) {
    const { data } = await client
      .from("beta_settings")
      .select("enabled")
      .eq("id", true)
      .maybeSingle();
    return data?.enabled ?? false;
  }

  const state = await getBetaState();
  return state.enabled;
}

export async function isListedBetaTester(
  email: string,
  client?: SupabaseClient<Database>
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();

  if (client) {
    const { data } = await client
      .from("beta_testers")
      .select("email")
      .eq("email", normalized)
      .maybeSingle();
    return data !== null;
  }

  const state = await getBetaState();
  return state.testers.some((tester) => tester.email.toLowerCase() === normalized);
}

/** What getFarmContext() actually needs: beta mode on AND this email listed. */
export async function hasBetaProAccess(
  email: string,
  client?: SupabaseClient<Database>
): Promise<boolean> {
  if (!(await isBetaModeEnabled(client))) return false;
  return isListedBetaTester(email, client);
}
