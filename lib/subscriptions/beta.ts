import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

/**
 * Beta testing phase (app/admin/'s beta panel): a global toggle plus up to 5
 * testers, by email, who get full Pro-tier access on their own farms without
 * a real subscription -- see lib/auth/session.ts's getFarmContext() for the
 * entitlement override, and app/auth/actions.ts's signUpAction for the
 * closed-beta signup gate that reuses the same list.
 *
 * Each function takes an optional `client`, defaulting to the ordinary
 * request-scoped client (RLS: beta_settings is readable by any signed-in
 * user, beta_testers only self-row) -- signUpAction passes the admin client
 * explicitly instead, since there is no session yet for RLS to key off of
 * before an account exists.
 */

export async function isBetaModeEnabled(client?: SupabaseClient<Database>): Promise<boolean> {
  const supabase = client ?? (await createSupabaseServerClient());

  const { data } = await supabase
    .from("beta_settings")
    .select("enabled")
    .eq("id", true)
    .maybeSingle();

  return data?.enabled ?? false;
}

export async function isListedBetaTester(
  email: string,
  client?: SupabaseClient<Database>
): Promise<boolean> {
  const supabase = client ?? (await createSupabaseServerClient());

  const { data } = await supabase
    .from("beta_testers")
    .select("email")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  return data !== null;
}

/** What getFarmContext() actually needs: beta mode on AND this email listed. */
export async function hasBetaProAccess(
  email: string,
  client?: SupabaseClient<Database>
): Promise<boolean> {
  if (!(await isBetaModeEnabled(client))) return false;
  return isListedBetaTester(email, client);
}
