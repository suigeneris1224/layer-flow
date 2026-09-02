import "server-only";

import { redirect } from "next/navigation";
import { requireUser, type SessionUser } from "@/lib/auth/session";
import { serverEnv } from "@/lib/config/env";

/**
 * LayerFlow's own operators -- not a farm role, not a database flag. A
 * hardcoded email allowlist (`ADMIN_EMAILS`) is deliberate: this page is for
 * one or two people running the business, not a feature farmers ever see or
 * a permission a farmer could ever be granted by mistake.
 */
export function isPlatformAdmin(email: string): boolean {
  return serverEnv.adminEmails.includes(email.trim().toLowerCase());
}

/** Farm context or bust, but for the operator's own cross-tenant pages. */
export async function requirePlatformAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isPlatformAdmin(user.email)) redirect("/dashboard");
  return user;
}
