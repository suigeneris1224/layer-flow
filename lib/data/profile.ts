import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/observability/logger";

/**
 * Reading and writing the signed-in user's own profile.
 *
 * The `profiles` table has existed since the core migration -- auto-created by
 * app.handle_new_user() on signup -- but nothing in the app had ever read it.
 * The topbar took its display name from auth user_metadata instead, which is
 * why editing your name was impossible: there was no screen, and the value the
 * UI showed was not the one the table held.
 *
 * Every query here is scoped to a single id supplied by the verified session,
 * and RLS (profiles_select_self_or_teammate / profiles_update_self) enforces
 * that independently.
 */

export interface Profile {
  id: string;
  fullName: string;
  phone: string;
  avatarUrl: string | null;
  coverUrl: string | null;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, avatar_url, cover_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    logger.error("profile lookup failed", { reason: error.message });
    return null;
  }
  if (!data) return null;

  return {
    id: data.id,
    fullName: data.full_name ?? "",
    phone: data.phone ?? "",
    avatarUrl: data.avatar_url,
    coverUrl: data.cover_url,
  };
}
